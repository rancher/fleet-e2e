deps: 
	go install -mod=mod github.com/onsi/ginkgo/v2/ginkgo
	go install -mod=mod github.com/onsi/gomega
	go mod tidy

e2e-install-rancher: deps
	ginkgo --label-filter install -r -v ./e2e

start-cypress-tests:
	@./scripts/start-cypress-tests
