/*
Copyright © 2022 - 2026 SUSE LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package e2e_test

import (
	"fmt"
	"strings"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/rancher-sandbox/ele-testhelpers/kubectl"
	"github.com/rancher-sandbox/ele-testhelpers/rancher"
	"github.com/rancher-sandbox/ele-testhelpers/tools"
)

var _ = Describe("E2E - Upgrading Rancher Manager", Label("upgrade-rancher-manager"), func() {
	// Create kubectl context
	// Default timeout is too small, so New() cannot be used
	k := &kubectl.Kubectl{
		Namespace:    "",
		PollTimeout:  tools.SetTimeout(300 * time.Second),
		PollInterval: 500 * time.Millisecond,
	}

	It("Upgrades Rancher Manager", func() {
		// Report to Qase
		testCaseID = 52

		// Get before-upgrade Rancher Manager version
		getImageVersion := []string{
			"get", "pod",
			"--namespace", "cattle-system",
			"-l", "app=rancher",
			"-o", "jsonpath={.items[*].status.containerStatuses[*].image}",
		}
		versionBeforeUpgrade, err := kubectl.RunWithoutErr(getImageVersion...)
		Expect(err).To(Not(HaveOccurred()))

		// Get Fleet Version before-upgrade
		getFleetImageVersion := []string{"get", "pod",
			"--namespace", "cattle-fleet-system",
			"-l", "app=fleet-controller",
			"-o", "jsonpath={.items[*].status.containerStatuses[*].image}",
		}

		// Execute the shell command to get version before upgrade
		fleetVersionBeforeUpgrade, err := kubectl.RunWithoutErr(getFleetImageVersion...)
		Expect(err).To(Not(HaveOccurred()))

		// Upgrade Rancher Manager
		// NOTE: Don't check the status, we can have false-positive here...
		//       Better to check the rollout after the upgrade, it will fail if the upgrade failed
		upgradeExtraFlags := rancherExtraFlags(rancherUpgradeChannel, rancherUpgradeVersion, rancherUpgradeHeadVersion)
		_ = rancher.DeployRancherManager(
			rancherHostname,
			rancherUpgradeChannel,
			rancherUpgradeVersion,
			rancherUpgradeHeadVersion,
			"None",
			"None",
			upgradeExtraFlags,
		)

		// Wait for Rancher Manager to be restarted
		// NOTE: 1st or 2nd rollout command can sporadically fail, so better to use Eventually here
		Eventually(func() string {
			status, _ := kubectl.RunWithoutErr(
				"rollout",
				"--namespace", "cattle-system",
				"status", "deployment/rancher",
			)
			return status
		}, tools.SetTimeout(4*time.Minute), 10*time.Second).Should(ContainSubstring("successfully rolled out"))

		// Check that all Rancher Manager pods are running
		Eventually(func() error {
			checkList := [][]string{
				{"cattle-system", "app=rancher"},
				{"cattle-fleet-local-system", "app=fleet-agent"},
				{"cattle-system", "app=rancher-webhook"},
			}
			return rancher.CheckPod(k, checkList)
		}, tools.SetTimeout(3*time.Minute), 10*time.Second).Should(Not(HaveOccurred()))

		// Check that all pods are using the same version
		Eventually(func() int {
			out, _ := kubectl.RunWithoutErr(getImageVersion...)
			return len(strings.Fields(out))
		}, tools.SetTimeout(3*time.Minute), 10*time.Second).Should(Equal(1))

		// Get after-upgrade Rancher Manager version
		// and check that it's different to the before-upgrade version
		versionAfterUpgrade, err := kubectl.RunWithoutErr(getImageVersion...)
		Expect(err).To(Not(HaveOccurred()))
		Expect(versionAfterUpgrade).To(Not(Equal(versionBeforeUpgrade)))

		// extractTag returns the version tag from a full image reference, e.g.
		// "stgregistry.suse.com/rancher/fleet:v0.16.2" -> "v0.16.2"
		// Compares tags only so a registry change (docker.io vs stgregistry.suse.com)
		// does not cause a false-pass when the Fleet version itself didn't change.
		extractTag := func(image string) string {
			parts := strings.SplitN(image, ":", 2)
			if len(parts) == 2 {
				return parts[1]
			}
			return image
		}

		beforeUpgradeImages := strings.Fields(fleetVersionBeforeUpgrade)

		// Wait for Fleet pods to roll out with a genuinely different version tag.
		Eventually(func(g Gomega) {
			rolloutStatus, err := kubectl.RunWithoutErr(
				"rollout",
				"--namespace", "cattle-fleet-system",
				"status", "deployment/fleet-controller",
			)
			g.Expect(err).To(Not(HaveOccurred()))
			g.Expect(rolloutStatus).To(ContainSubstring(`deployment "fleet-controller" successfully rolled out`))

			fleetVersionAfterUpgrade, err := kubectl.RunWithoutErr(getFleetImageVersion...)
			g.Expect(err).To(Not(HaveOccurred()))

			afterUpgradeImages := strings.Fields(fleetVersionAfterUpgrade)
			g.Expect(len(afterUpgradeImages)).To(Equal(3))

			for i, afterImage := range afterUpgradeImages {
				afterTag := extractTag(afterImage)
				beforeTag := extractTag(beforeUpgradeImages[i])
				fmt.Printf("Fleet image %d — before: %s, after: %s\n", i+1, beforeTag, afterTag)
				g.Expect(afterTag).To(Not(Equal(beforeTag)),
					"Fleet image %d version tag must change after upgrade (got same tag %s)", i+1, afterTag)
			}

			fmt.Println("Fleet version after upgrade:", fleetVersionAfterUpgrade)
		}, tools.SetTimeout(10*time.Minute), 20*time.Second).Should(Succeed())

		// Wait for all downstream clusters to reconnect and report Ready.
		// The Ginkgo upgrade test only verifies local Fleet pods; downstream agents
		// reconnect asynchronously and must be Ready before Cypress Phase 2 runs.
		By("Waiting for downstream clusters to be Ready after upgrade", func() {
			count := 1
			Eventually(func() error {
				// List all non-local imported cluster IDs
				clusterIDs, err := kubectl.RunWithoutErr(
					"get", "clusters.management.cattle.io",
					"--field-selector", "metadata.name!=local",
					"-o", "jsonpath={.items[*].metadata.name}",
				)
				if err != nil {
					return err
				}
				for _, clusterID := range strings.Fields(clusterIDs) {
					status, err := kubectl.RunWithoutErr(
						"get", "clusters.management.cattle.io", clusterID,
						"-o", "jsonpath={.status.conditions[?(@.type==\"Ready\")].status}",
					)
					GinkgoWriter.Printf("Downstream cluster %s Ready status (loop %d): %s\n", clusterID, count, status)
					if err != nil || !strings.Contains(status, "True") {
						return fmt.Errorf("cluster %s not Ready yet (status=%s)", clusterID, status)
					}
				}
				count++
				return nil
			}, tools.SetTimeout(5*time.Minute), 15*time.Second).Should(Succeed())
		})
	})
})
