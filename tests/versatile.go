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
	apiToken := "AAAAAAAAAAAAAAAAAAAAAAAA"
	// ok: hardcoded-credential-go
	tokenHeader := "Authorization"
	_ = tokenHeader
	_ = apiToken
	// ruleid: hardcoded-credential-go
	return client{APIKey: "BBBBBBBBBBBBBBBBBBBBBBBB"}
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
