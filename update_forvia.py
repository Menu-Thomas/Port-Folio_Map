import re

def update_forvia_integration():
    """Update main.js to include forviaCAR in all necessary interaction handlers"""
    
    # Read the current file
    with open('main.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pattern to find the object condition check and add forviaCAR
    pattern1 = r"(object\.userData\.type === 'trashTruck' \|\| object\.userData\.type === 'convoyeur' \|\| object\.userData\.type === 'sensorSensei' \|\| object\.userData\.type === 'medical')"
    replacement1 = r"object.userData.type === 'trashTruck' || object.userData.type === 'convoyeur' || object.userData.type === 'sensorSensei' || object.userData.type === 'medical' || object.userData.type === 'forviaCAR'"
    
    # Pattern to add forviaCAR modal call
    pattern2 = r"(\s+if \(object\.userData\.type === 'medical' && !medicalModalClosed\) \{\s+showMedicalModal\(\);\s+\})"
    replacement2 = r"\1\n        if (object.userData.type === 'forviaCAR' && !forviaCarModalClosed) {\n          showForviaCarModal();\n        }"
    
    # Pattern to update comment
    pattern3 = r"// Handle objects that don't need camera movement \(trashTruck, convoyeur, sensorSensei, medical\)"
    replacement3 = "// Handle objects that don't need camera movement (trashTruck, convoyeur, sensorSensei, medical, forviaCAR)"
    
    # Pattern to reset forviaCAR modal state on navigation
    pattern4 = r"(\s+// Reset medical modal state when going back to overview\s+medicalModalClosed = false;\s+medicalModalOpened = false;)"
    replacement4 = r"\1\n    \n    // Reset forviaCAR modal state when going back to overview\n    forviaCarModalClosed = false;\n    forviaCarModalOpened = false;"
    
    # Pattern to reset forviaCAR modal state when navigating to different areas
    pattern5 = r"(\s+// Reset medical modal state when navigating to different areas\s+medicalModalClosed = false;\s+medicalModalOpened = false;)"
    replacement5 = r"\1\n      \n      // Reset forviaCAR modal state when navigating to different areas\n      forviaCarModalClosed = false;\n      forviaCarModalOpened = false;"
    
    # Apply all replacements
    content = re.sub(pattern1, replacement1, content)
    content = re.sub(pattern2, replacement2, content)
    content = re.sub(pattern3, replacement3, content)
    content = re.sub(pattern4, replacement4, content)
    content = re.sub(pattern5, replacement5, content)
    
    # Write the updated content back
    with open('main.js', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("FORVIA car integration completed successfully!")

if __name__ == "__main__":
    update_forvia_integration()
