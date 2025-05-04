#!/bin/bash

set -x  # Enable debug output

# Check if path.json exists
if [ ! -f "path.json" ]; then
    echo "Error: path.json not found" >&2
    exit 1
fi

# Check if path_config.json exists
if [ ! -f "path_config.json" ]; then
    echo "Error: path_config.json not found" >&2
    exit 1
fi

# Remove existing path_output.txt if it exists
if [ -f "path_output.txt" ]; then
    rm path_output.txt
fi

# Read allowed extensions from path_config.json and prepare for find -name
allowed_extensions=$(jq -r '.allowed_extensions[]' path_config.json)
# Convert extensions to find -name arguments with -o (OR) operator
name_patterns=""
first_ext=1
for ext in $allowed_extensions; do
    if [ $first_ext -eq 1 ]; then
        name_patterns="-name *${ext}"
        first_ext=0
    else
        name_patterns="$name_patterns -o -name *${ext}"
    fi
done

# Read paths from path.json using jq and process each entry
jq -r '.paths[]' path.json | while read -r path_entry; do
    # Check if the path contains a wildcard
    if [[ "$path_entry" == *"*"* ]]; then
        # Remove the /* from the end to get the directory path
        dir_path="${path_entry%/*}"

        # Check if directory exists
        if [ -d "$dir_path" ]; then
            # Loop through files in the directory that match allowed extensions
            find "$dir_path" -maxdepth 1 -type f \( $name_patterns \) | while read -r file_path; do
                # Log reading the file
                echo "Reading file: $file_path" >&2
                # Write file path to output
                echo "$file_path" >> path_output.txt

                # Log appending file content
                echo "Appending content of $file_path to path_output.txt" >&2
                # Write file contents to output
                if [ -f "$file_path" ]; then
                    cat "$file_path" >> path_output.txt
                else
                    echo "File not found" >> path_output.txt
                fi

                # Add empty line and separator
                echo "" >> path_output.txt
                echo "################" >> path_output.txt
            done
        else
            echo "Directory not found: $dir_path" >&2
            echo "$dir_path" >> path_output.txt
            echo "Directory not found" >> path_output.txt
            echo "" >> path_output.txt
            echo "################" >> path_output.txt
        fi
    else
        # Handle specific file paths (no wildcard)
        echo "Reading file: $path_entry" >&2
        echo "$path_entry" >> path_output.txt

        # Log appending file content
        echo "Appending content of $path_entry to path_output.txt" >&2
        # Write file contents to output
        if [ -f "$path_entry" ]; then
            cat "$path_entry" >> path_output.txt
        else
            echo "File not found" >> path_output.txt
        fi

        # Add empty line and separator
        echo "" >> path_output.txt
        echo "################--------------------################" >> path_output.txt
    fi
done

echo "Output written to path_output.txt" >&2