import os
import sys
import shutil
import subprocess
import zipfile
import wave

def main():
    print("=== EchoX Demucs Standalone Packaging Tool ===")
    
    # 1. Setup Virtual Environment
    venv_dir = "venv_build_demucs"
    if not os.path.exists(venv_dir):
        print(f"[*] Creating isolated virtual environment at {venv_dir}...")
        subprocess.run([sys.executable, "-m", "venv", venv_dir], check=True)
    else:
        print(f"[*] Virtual environment {venv_dir} already exists. Reusing...")

    # Resolve executable paths for virtual environment
    if sys.platform == "win32":
        pip_exe = os.path.join(venv_dir, "Scripts", "pip.exe")
        python_exe = os.path.join(venv_dir, "Scripts", "python.exe")
        pyinstaller_exe = os.path.join(venv_dir, "Scripts", "pyinstaller.exe")
    else:
        pip_exe = os.path.join(venv_dir, "bin", "pip")
        python_exe = os.path.join(venv_dir, "bin", "python")
        pyinstaller_exe = os.path.join(venv_dir, "bin", "pyinstaller")

    # 2. Install dependencies
    print("[*] Installing torch, torchaudio, demucs, and pyinstaller (this may take a few minutes)...")
    subprocess.run([python_exe, "-m", "pip", "install", "--upgrade", "pip"], check=True)
    subprocess.run([python_exe, "-m", "pip", "install", "torch", "torchaudio", "demucs", "pyinstaller"], check=True)

    # 3. Download the model weights directly using urllib to avoid execution crashes
    print("[*] Checking default 'htdemucs' model weights...")
    user_home = os.path.expanduser("~")
    checkpoints_dir = os.path.join(user_home, ".cache", "torch", "hub", "checkpoints")
    os.makedirs(checkpoints_dir, exist_ok=True)
    
    htdemucs_weight = "955717e8-8726e21a.th"
    weight_src_path = os.path.join(checkpoints_dir, htdemucs_weight)
    
    if not os.path.exists(weight_src_path):
        import urllib.request
        url = f"https://dl.fbaipublicfiles.com/demucs/hybrid_transformer/{htdemucs_weight}"
        print(f"[*] Downloading {url} to {weight_src_path}...")
        
        def reporthook(blocknum, blocksize, totalsize):
            readsofar = blocknum * blocksize
            if totalsize > 0:
                percent = readsofar * 1e2 / totalsize
                s = f"\r[~] Progress: {percent:5.1f}%"
                sys.stdout.write(s)
                sys.stdout.flush()
            else:
                sys.stdout.write(f"\r[~] Read {readsofar} bytes")
        
        urllib.request.urlretrieve(url, weight_src_path, reporthook)
        print("\n[+] Download completed successfully!")
    else:
        print(f"[+] Model weights already cached: {weight_src_path}")

    # 5. Create PyInstaller entrypoint script
    entrypoint_script = "entrypoint_demucs.py"
    with open(entrypoint_script, "w") as f:
        f.write("import sys\n")
        f.write("from demucs.separate import main\n\n")
        f.write("if __name__ == '__main__':\n")
        f.write("    main()\n")

    # 6. Run PyInstaller to bundle executable
    print("[*] Compiling Demucs with PyInstaller (packaging torch, torchaudio, and demucs)...")
    dist_dir = "dist"
    build_dir = "build"
    shutil.rmtree(dist_dir, ignore_errors=True)
    shutil.rmtree(build_dir, ignore_errors=True)

    subprocess.run([
        pyinstaller_exe,
        "--onedir",
        "--name=demucs",
        "--hidden-import=demucs",
        "--hidden-import=demucs.separate",
        "--hidden-import=julius",
        "--hidden-import=lameenc",
        "--exclude-module=torch",
        "--exclude-module=torchaudio",
        "--exclude-module=numpy",
        entrypoint_script
    ], check=True)

    # 7. Copy excluded packages directly from virtual environment site-packages
    site_packages = (
        os.path.join(venv_dir, "Lib", "site-packages")
        if sys.platform == "win32"
        else os.path.join(venv_dir, "lib", f"python{sys.version_info.major}.{sys.version_info.minor}", "site-packages")
    )
    excluded_libs = ["torch", "torchaudio", "numpy"]
    
    # In PyInstaller 6+, all python libraries are nested in a subfolder named '_internal'
    internal_dir = os.path.join(dist_dir, "demucs", "_internal")
    target_base = internal_dir if os.path.exists(internal_dir) else os.path.join(dist_dir, "demucs")
    
    for lib in excluded_libs:
        src_path = os.path.join(site_packages, lib)
        dest_path = os.path.join(target_base, lib)
        if os.path.exists(src_path):
            print(f"[*] Copying {lib} package files to {dest_path}...")
            shutil.copytree(src_path, dest_path, ignore=shutil.ignore_patterns("*.pyc", "__pycache__"))

    # 8. Copy model weight to the output package structure
    package_weights_dir = os.path.join(dist_dir, "demucs", "hub", "checkpoints")
    os.makedirs(package_weights_dir, exist_ok=True)
    weight_dest_path = os.path.join(package_weights_dir, htdemucs_weight)
    print(f"[*] Copying model weights to standalone folder: {weight_dest_path}")
    shutil.copy2(weight_src_path, weight_dest_path)

    # 8. Create demucs-win.zip
    zip_name = "demucs-win.zip"
    print(f"[*] Compressing package into {zip_name}...")
    if os.path.exists(zip_name):
        os.remove(zip_name)

    with zipfile.ZipFile(zip_name, "w", zipfile.ZIP_DEFLATED) as z:
        base_path = os.path.join(dist_dir, "demucs")
        for root, dirs, files in os.walk(base_path):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, base_path)
                z.write(full_path, rel_path)

    # 9. Clean up temporary files
    print("[*] Cleaning up temporary build folders...")
    shutil.rmtree(build_dir, ignore_errors=True)
    shutil.rmtree(dist_dir, ignore_errors=True)
    shutil.rmtree("separated", ignore_errors=True)
    if os.path.exists(entrypoint_script):
        os.remove(entrypoint_script)
    if os.path.exists("demucs.spec"):
        os.remove("demucs.spec")
    
    print("\n[+] SUCCESS! Standalone Demucs package created.")
    print(f"[+] Output package location: {os.path.abspath(zip_name)}")
    print("[+] Place this ZIP under the backend/static/ directory on your server.")

if __name__ == '__main__':
    main()
