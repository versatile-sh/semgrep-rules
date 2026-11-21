use std::process::Command;

fn run(name: &str) {
    // ruleid: shell-string-exec-rs
    Command::new("sh").arg("-c").arg(format!("ls {}", name)).status().unwrap();
    // ok: shell-string-exec-rs
    Command::new("sh").arg("-c").arg("ls -la").status().unwrap();
    // ok: shell-string-exec-rs
    Command::new("ls").arg(name).status().unwrap();
}
