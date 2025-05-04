#!/bin/bash

# Check if path.json exists
if [ ! -f "path.json" ]; then
    echo "Error: path.json not found"
    exit 1
fi

# Remove existing path_output.txt if it exists
if [ -f "path_output.txt" ]; then
    rm path_output.txt
fi

# Read paths from path.json using jq and process each entry
jq -r '.paths[]' path.json | while read -r path_entry; do
    # Check if the path contains a wildcard
    if [[ "$path_entry" == *"*"* ]]; then
        # Remove the /* from the end to get the directory path
        dir_path="${path_entry%/*}"

        # Check if directory exists
        if [ -d "$dir_path" ]; then
            # Loop through all files in the directory
            find "$dir_path" -maxdepth 1 -type f | while read -r file_path; do
                # Write file path to output
                echo "$file_path" >> path_output.txt

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
            echo "$dir_path" >> path_output.txt
            echo "Directory not found" >> path_output.txt
            echo "" >> path_output.txt
            echo "################" >> path_output.txt
        fi
    else
        # Handle specific file paths (no wildcard)
        echo "$path_entry" >> path_output.txt

        # Check if file exists
        if [ -f "$path_entry" ]; then
            # Write file contents to output
            cat "$path_entry" >> path_output.txt
        else
            echo "File not found" >> path_output.txt
        fi

        # Add empty line and separator
        echo "" >> path_output.txt
        echo "################--------------------################" >> path_output.txt
    fi
done

echo "Output written to path_output.txt"