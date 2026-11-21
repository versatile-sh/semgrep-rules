.PHONY: check test semgrep images

SEMGREP := semgrep --metrics=off --disable-version-check

check: test semgrep
	cd docs/assets/src && npm ci --silent && npm run --silent lint

test:
	$(SEMGREP) --validate --config rules/versatile.yml
	for f in tests/*; do $(SEMGREP) --test --config rules/versatile.yml "$$f" || exit 1; done

semgrep:
	$(SEMGREP) scan --error --severity WARNING --severity ERROR --config p/secrets --config rules/versatile.yml

images:
	cd docs/assets/src && npm ci && node build-banners.mjs
