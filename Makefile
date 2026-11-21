.PHONY: check test semgrep images

FLAGS := --metrics=off --disable-version-check

check: test semgrep
	cd docs/assets/src && npm ci --silent && npm run --silent lint

test:
	semgrep --validate $(FLAGS) --config rules/versatile.yml
	for f in tests/*; do semgrep --test $(FLAGS) --config rules/versatile.yml "$$f" || exit 1; done

semgrep:
	semgrep scan $(FLAGS) --error --severity WARNING --severity ERROR --config p/secrets --config rules/versatile.yml

images:
	cd docs/assets/src && npm ci && node build-banners.mjs
