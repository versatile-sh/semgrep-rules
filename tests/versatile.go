package fixture

import (
	"log"
	"log/slog"
	"net/http"
	"os/exec"
)

type client struct{ APIKey string }

func credentials() client {
	// ruleid: hardcoded-credential-go
	apiToken := "AAAA1111AAAA2222AAAA3333"
	// ok: hardcoded-credential-go
	tokenHeader := "Authorization"
	_ = tokenHeader
	// ok: hardcoded-credential-go
	unitTokensCacheRead := "tokens.cache_read"
	_ = unitTokensCacheRead
	// ok: hardcoded-credential-go
	adminCredentialScopes := "adminCredential.Scopes"
	_ = adminCredentialScopes
	// ok: hardcoded-credential-go
	secretKeyField := "client_secret_value_name"
	_ = secretKeyField
	// ok: hardcoded-credential-go
	credentialOAuth2ClientCredentials := "oauth2_client_credentials"
	_ = credentialOAuth2ClientCredentials
	// ruleid: hardcoded-credential-go
	sessionSecret := "9f86d081884c7d659a2feaa0c55ad015"
	_ = sessionSecret
	// ok: hardcoded-credential-go
	tokenPath := "/etc/kubernetes/pki/token2"
	_ = tokenPath
	// ok: hardcoded-credential-go
	secretAlphabet := "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	_ = secretAlphabet
	_ = apiToken
	// ruleid: hardcoded-credential-go
	return client{APIKey: "BBBB1111BBBB2222BBBB3333"}
}

func run(name string) {
	// ruleid: shell-string-exec-go
	_ = exec.Command("sh", "-c", "ls "+name).Run()
	// ok: shell-string-exec-go
	_ = exec.Command("sh", "-c", "ls -la").Run()
	// ok: shell-string-exec-go
	_ = exec.Command("ls", name).Run()
}

func handle(w http.ResponseWriter, r *http.Request) {
	// ruleid: logged-request-secrets-go
	slog.Info("request", "headers", r.Header)
	// ruleid: logged-request-secrets-go
	log.Printf("auth %s", r.Header.Get("Authorization"))
	// ok: logged-request-secrets-go
	slog.Info("request", "path", r.URL.Path)
}
