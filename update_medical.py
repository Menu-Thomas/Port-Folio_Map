import re

# Read the file
with open('main.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add medical to the condition checks
content = re.sub(
    r"if \(object\.userData\.type === 'trashTruck' \|\| object\.userData\.type === 'convoyeur' \|\| object\.userData\.type === 'sensorSensei'\)",
    "if (object.userData.type === 'trashTruck' || object.userData.type === 'convoyeur' || object.userData.type === 'sensorSensei' || object.userData.type === 'medical')",
    content
)

# Add medical modal calls after sensorSensei calls
content = re.sub(
    r"(\s+if \(object\.userData\.type === 'sensorSensei' && !sensorSenseiModalClosed\) \{\s+showSensorSenseiModal\(\);\s+\})",
    r"\1\n        if (object.userData.type === 'medical' && !medicalModalClosed) {\n          showMedicalModal();\n        }",
    content
)

# Add medical modal resets after sensorSensei resets
content = re.sub(
    r"(\s+// Reset sensorSensei modal state when navigating to different areas\s+sensorSenseiModalClosed = false;\s+sensorSenseiModalOpened = false;)",
    r"\1\n      \n      // Reset medical modal state when navigating to different areas\n      medicalModalClosed = false;\n      medicalModalOpened = false;",
    content
)

# Update comments
content = re.sub(
    r"// Handle objects that don't need camera movement \(trashTruck, convoyeur, sensorSensei\)",
    "// Handle objects that don't need camera movement (trashTruck, convoyeur, sensorSensei, medical)",
    content
)

# Write the file back
with open('main.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Medical integration completed successfully!")
