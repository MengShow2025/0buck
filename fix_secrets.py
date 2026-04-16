import os
import glob

token_to_replace = "os.getenv("SHOPIFY_ACCESS_TOKEN", "")"
token_to_replace_2 = "os.getenv("SHOPIFY_ACCESS_TOKEN", "")"

files = glob.glob("**/*.py", recursive=True) + glob.glob("**/*.sh", recursive=True) + glob.glob("**/*.js", recursive=True)

for file_path in files:
    if "venv" in file_path: continue
    try:
        with open(file_path, "r") as f:
            content = f.read()
        
        if token_to_replace in content or token_to_replace_2 in content:
            print(f"Fixing {file_path}")
            new_content = content.replace(token_to_replace, 'os.getenv("SHOPIFY_ACCESS_TOKEN", "")')
            new_content = new_content.replace(token_to_replace_2, 'os.getenv("SHOPIFY_ACCESS_TOKEN", "")')
            
            if ".py" in file_path and "import os" not in new_content:
                new_content = "import os\n" + new_content
            
            with open(file_path, "w") as f:
                f.write(new_content)
    except Exception as e:
        print(f"Error fixing {file_path}: {e}")
