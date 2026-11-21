import subprocess


def run(name):
    # ruleid: shell-string-exec-py
    subprocess.run("ls " + name, shell=True)
    # ok: shell-string-exec-py
    subprocess.run("ls -la", shell=True)
    # ok: shell-string-exec-py
    subprocess.run(["ls", name])
