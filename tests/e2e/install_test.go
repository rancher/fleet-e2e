/*
Copyright © 2023 - 2024 SUSE LLC

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
	"os"
	"os/exec"
	"strings"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/rancher-sandbox/ele-testhelpers/kubectl"
	"github.com/rancher-sandbox/ele-testhelpers/rancher"
	"github.com/rancher-sandbox/ele-testhelpers/tools"
)

func rolloutDeployment(ns, d string) {
	// NOTE: 1st or 2nd rollout command can sporadically fail, so better to use Eventually here
	Eventually(func() string {
		status, _ := kubectl.Run("rollout", "restart", "deployment/"+d,
			"--namespace", ns)
		return status
	}, tools.SetTimeout(1*time.Minute), 20*time.Second).Should(ContainSubstring("restarted"))

	// Wait for deployment to be restarted
	Eventually(func() string {
		status, _ := kubectl.Run("rollout", "status", "deployment/"+d,
			"--namespace", ns)
		return status
	}, tools.SetTimeout(2*time.Minute), 30*time.Second).Should(ContainSubstring("successfully rolled out"))
}

var _ = Describe("E2E - Install Rancher Manager", Label("install"), func() {
	// Create kubectl context
	// Default timeout is too small, so New() cannot be used
	k := &kubectl.Kubectl{
		Namespace:    "",
		PollTimeout:  tools.SetTimeout(300 * time.Second),
		PollInterval: 500 * time.Millisecond,
	}

	// Define local Kubeconfig file
	localKubeconfig := os.Getenv("HOME") + "/.kube/config"

	// Used for creating downstream cluster(s)
	type genericYAMLStruct struct {
		APIVersion string `yaml:"apiVersion"`
		Kind       string `yaml:"kind"`
		Metadata   struct {
			Name      string `yaml:"name"`
			Namespace string `yaml:"namespace"`
		} `yaml:"metadata"`
	}

	// Global variables
	var downstreamClusterName string
	var insecureRegistrationCommand string

	It("Install Rancher Manager", func() {
		By("Installing K3s", func() {
			// Get K3s installation script
			fileName := "k3s-install.sh"
			Eventually(func() error {
				return tools.GetFileFromURL("https://get.k3s.io", fileName, true)
			}, tools.SetTimeout(2*time.Minute), 10*time.Second).ShouldNot(HaveOccurred())

			// Set command and arguments
			installCmd := exec.Command("sh", fileName)
			// installCmd.Env = append(os.Environ(), "INSTALL_K3S_EXEC=--disable metrics-server")

			// Retry in case of (sporadic) failure...
			count := 1
			Eventually(func() error {
				// Execute K3s installation
				out, err := installCmd.CombinedOutput()
				GinkgoWriter.Printf("K3s installation loop %d:\n%s\n", count, out)
				count++
				return err
			}, tools.SetTimeout(2*time.Minute), 5*time.Second).Should(BeNil())
		})

		By("Starting K3s", func() {
			err := exec.Command("sudo", "systemctl", "start", "k3s").Run()
			Expect(err).To(Not(HaveOccurred()))

			// Delay few seconds before checking
			time.Sleep(tools.SetTimeout(20 * time.Second))
		})

		By("Waiting for K3s to be started", func() {
			// Wait for all pods to be started
			checkList := [][]string{
				{"kube-system", "app=local-path-provisioner"},
				{"kube-system", "k8s-app=kube-dns"},
				{"kube-system", "app.kubernetes.io/name=traefik"},
				{"kube-system", "svccontroller.k3s.cattle.io/svcname=traefik"},
			}
			Eventually(func() error {
				return rancher.CheckPod(k, checkList)
			}, tools.SetTimeout(4*time.Minute), 30*time.Second).Should(BeNil())
		})

		By("Configuring Kubeconfig file", func() {
			// Copy K3s file in ~/.kube/config
			// NOTE: don't check for error, as it will happen anyway (only K3s or RKE2 is installed at a time)
			file, _ := exec.Command("bash", "-c", "ls /etc/rancher/{k3s,rke2}/{k3s,rke2}.yaml").Output()
			Expect(file).To(Not(BeEmpty()))
			err := tools.CopyFile(strings.Trim(string(file), "\n"), localKubeconfig)
			Expect(err).To(Not(HaveOccurred()))

			err = os.Setenv("KUBECONFIG", localKubeconfig)
			Expect(err).To(Not(HaveOccurred()))
		})

		By("Installing CertManager", func() {
			RunHelmCmdWithRetry("repo", "add", "jetstack", "https://charts.jetstack.io")
			RunHelmCmdWithRetry("repo", "update")

			// Set flags for cert-manager installation
			flags := []string{
				"upgrade", "--install", "cert-manager", "jetstack/cert-manager",
				"--namespace", "cert-manager",
				"--create-namespace",
				"--set", "installCRDs=true",
				"--wait", "--wait-for-jobs",
			}

			RunHelmCmdWithRetry(flags...)

			checkList := [][]string{
				{"cert-manager", "app.kubernetes.io/component=controller"},
				{"cert-manager", "app.kubernetes.io/component=webhook"},
				{"cert-manager", "app.kubernetes.io/component=cainjector"},
			}
			Eventually(func() error {
				return rancher.CheckPod(k, checkList)
			}, tools.SetTimeout(4*time.Minute), 30*time.Second).Should(BeNil())
		})

		By("Installing Rancher Manager", func() {
			err := rancher.DeployRancherManager(rancherHostname, rancherChannel, rancherVersion, rancherHeadVersion, "none", "none")
			Expect(err).To(Not(HaveOccurred()))

			// Wait for all pods to be started
			checkList := [][]string{
				{"cattle-system", "app=rancher"},
				{"cattle-system", "app=rancher-webhook"},
			}
			Eventually(func() error {
				return rancher.CheckPod(k, checkList)
			}, tools.SetTimeout(4*time.Minute), 30*time.Second).Should(BeNil())
		})

		By("Waiting for fleet", func() {
			// Wait unit the kubectl command return exit code 0
			count := 1
			Eventually(func() error {
				out, err := kubectl.Run("rollout", "status",
					"--namespace", "cattle-fleet-system",
					"deployment", "fleet-controller",
				)
				GinkgoWriter.Printf("Waiting for fleet-controller deployment, loop %d:\n%s\n", count, out)
				count++
				return err
			}, tools.SetTimeout(2*time.Minute), 5*time.Second).Should(Not(HaveOccurred()))

			checkList := [][]string{
				{"cattle-fleet-system", "app=fleet-controller"},
			}
			Eventually(func() error {
				return rancher.CheckPod(k, checkList)
			}, tools.SetTimeout(4*time.Minute), 30*time.Second).Should(BeNil())
		})

		By("Configuring kubectl to use Rancher admin user", func() {
			// Getting internal username for admin
			internalUsername, err := kubectl.Run("get", "user",
				"-o", "jsonpath={.items[?(@.username==\"admin\")].metadata.name}",
			)
			Expect(err).To(Not(HaveOccurred()))
			Expect(internalUsername).To(Not(BeEmpty()))

			// Add token in Rancher Manager
			err = tools.Sed("%ADMIN_USER%", internalUsername, ciTokenYaml)
			Expect(err).To(Not(HaveOccurred()))
			err = kubectl.Apply("default", ciTokenYaml)
			Expect(err).To(Not(HaveOccurred()))

			// Getting Rancher Manager local cluster CA
			// NOTE: loop until the cmd return something, it could take some time
			var rancherCA string
			Eventually(func() error {
				rancherCA, err = kubectl.Run("get", "secret",
					"--namespace", "cattle-system",
					"tls-rancher-ingress",
					"-o", "jsonpath={.data.tls\\.crt}",
				)
				return err
			}, tools.SetTimeout(2*time.Minute), 5*time.Second).Should(Not(HaveOccurred()))

			// Copy skel file for ~/.kube/config
			err = tools.CopyFile(localKubeconfigYaml, localKubeconfig)
			Expect(err).To(Not(HaveOccurred()))

			// Create kubeconfig for local cluster
			err = tools.Sed("%RANCHER_URL%", rancherHostname, localKubeconfig)
			Expect(err).To(Not(HaveOccurred()))
			err = tools.Sed("%RANCHER_CA%", rancherCA, localKubeconfig)
			Expect(err).To(Not(HaveOccurred()))

			// Set correct file permissions
			_ = exec.Command("chmod", "0600", localKubeconfig).Run()

			// Remove the "old" kubeconfig file to force the use of the new one
			// NOTE: in fact move it, just to keep it in case of issue
			// Also don't check the returned error, as it will always not equal 0
			_ = exec.Command("bash", "-c", "sudo mv -f /etc/rancher/{k3s,rke2}/{k3s,rke2}.yaml ~/").Run()
		})
		By("Create downstream cluster resource for import into rancher", func() {
			// TODO: Add support for multiple downstream clusters
			downstreamClusterName = "k3d-imported"

			clusterDefinitionYaml := genericYAMLStruct{
				APIVersion: "provisioning.cattle.io/v1",
				Kind:       "Cluster",
				Metadata: struct {
					Name      string `yaml:"name"`
					Namespace string `yaml:"namespace"`
				}{
					Name:      downstreamClusterName,
					Namespace: "fleet-default",
				},
			}

			err := k.ApplyYAML("fleet-default", downstreamClusterName, clusterDefinitionYaml)
			Expect(err).To(Not(HaveOccurred()))

			// Get and store internal cluster name
			// INTERNAL_CLUSTER_NAME=$(kubectl get clusters.provisioning.cattle.io -n fleet-default $CLUSTER_NAME -o jsonpath='{..status.clusterName}')
			var internalClusterName string
			Eventually(func() string {
				internalClusterName, _ = kubectl.Run("get", "clusters.provisioning.cattle.io",
					"--namespace", "fleet-default",
					downstreamClusterName,
					"-o", "jsonpath={..status.clusterName}",
				)
				return internalClusterName
			}, tools.SetTimeout(2*time.Minute), 10*time.Second).ShouldNot(BeEmpty())

			// Debug only
			// GinkgoWriter.Printf("Internal cluster name for cluster %s is: %s\n", downstreamClusterName, internalClusterName)

			// Get insecureCommand for importing cluster
			// INSECURE_COMMAND=$(kubectl get ClusterRegistrationToken.management.cattle.io -n $INTERNAL_CLUSTER_NAME -o jsonpath='{.items[0].status.insecureCommand}')
			insecureRegistrationCommand, err = kubectl.Run("get", "ClusterRegistrationToken.management.cattle.io",
				"--namespace", internalClusterName,
				"-o", "jsonpath={.items[0].status.insecureCommand}",
			)
			Expect(err).To(Not(HaveOccurred()))
			// Debug only
			// GinkgoWriter.Printf("InsecureCommand for cluster %s is: %s\n", downstreamClusterName, insecureRegistrationCommand)
		})
	})

	It("Provision K3d cluster", func() {
		By("Install k3d binary for provisioning downstream cluster", func() {
			fileName := "k3d-install.sh"
			Eventually(func() error {
				return tools.GetFileFromURL("https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh", fileName, true)
			}, tools.SetTimeout(2*time.Minute), 10*time.Second).ShouldNot(HaveOccurred())

			// Set command and arguments
			installCmd := exec.Command("bash", fileName)
			out, err := installCmd.CombinedOutput()
			GinkgoWriter.Printf("K3d binary installation (stdout):\n%s\n", out)
			Expect(err).To(Not(HaveOccurred()))
		})
		By("Provision and import downstream K3d cluster", func() {
			// Define local KUBECONFIG just for k3d operations
			envVars := []string{
				"KUBECONFIG=" + os.Getenv("HOME") + "/" + downstreamClusterName + "-kubeconfig.yaml",
			}

			// Allows changing k3d flags
			flags := []string{
				"--agents", "0",
				"--servers", "1",
				"--image", "rancher/k3s:" + k8sDownstreamVersion,
				"--api-port", "0.0.0.0:64430",
			}

			createCmd := exec.Command("k3d", "cluster", "create", "downstream"+"1")
			// K3d uses KUBECONFIG env as a destination for writing its kubeconfig
			createCmd.Env = append(os.Environ(), envVars...)
			createCmd.Args = append(createCmd.Args, flags...)
			out, err := createCmd.CombinedOutput()
			GinkgoWriter.Printf("Provisioning downstream k3d cluster (stdout):\n%s\n", out)
			Expect(err).To(Not(HaveOccurred()))

			// TODO: Wait for K3d resources instead od delay
			// Delay few seconds before checking
			// time.Sleep(tools.SetTimeout(20 * time.Second))

			count := 1
			Eventually(func() string {
				k3dApiCheckCmd := exec.Command("curl", "-v", "-k", "https://127.0.0.1:64430")
				out, _ := k3dApiCheckCmd.CombinedOutput()
				GinkgoWriter.Printf("K3d API response %d:\n%s\n", count, out)
				count++
				return string(out)
			}, tools.SetTimeout(2*time.Minute), 10*time.Second).Should(ContainSubstring("\"message\": \"Unauthorized\""))

			// Run the registration insecure command on downstream cluster
			regCmd := exec.Command("bash", "-c", insecureRegistrationCommand)
			regCmd.Env = append(os.Environ(), envVars...)
			// Debug only
			// GinkgoWriter.Printf("Registration command is:\n%s\n", insecureRegistrationCommand)
			out, err = regCmd.CombinedOutput()
			GinkgoWriter.Printf("Registration command output (stdout):\n%s\n", out)
			Expect(err).To(Not(HaveOccurred()))
		})
		By("Wait for downstream k3d cluster to import in Rancher", func() {
			count := 1
			Eventually(func() string {
				downstreamClusterStatus, _ := kubectl.Run("get", "clusters.provisioning.cattle.io",
					"--namespace", "fleet-default",
					downstreamClusterName,
					"-o", "jsonpath={.status.conditions[?(@.type==\"Ready\")].status}",
				)
				GinkgoWriter.Printf("Waiting for Active state of downstream cluster, loop %d\n", count)
				count++

				return downstreamClusterStatus
			}, tools.SetTimeout(2*time.Minute), 10*time.Second).Should(ContainSubstring("True"))
		})
	})
})
