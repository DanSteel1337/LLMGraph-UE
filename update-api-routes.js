/**
 * This is a script to update all API routes to use the new Supabase client.
 * You would run this script manually to update all API routes.
 *
 * Usage:
 * 1. Save this file as update-api-routes.js
 * 2. Run: node update-api-routes.js
 */

const fs = require("fs")
const path = require("path")

const apiRoutesDir = path.join(__dirname, "app", "api")

// Function to update a file
function updateFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8")

  // Replace old import
  if (content.includes("@/lib/auth/supabase")) {
    content = content.replace(
      /import\s+{\s*createEdgeClient\s*}\s+from\s+["']@\/lib\/auth\/supabase["']/g,
      `import { createEdgeClient } from "@/lib/supabase"`,
    )
  }

  // Replace getSession with getUser
  if (content.includes("getSession")) {
    content = content.replace(
      /const\s+{\s*data\s*:\s*{\s*session\s*}\s*}\s*=\s*await\s+supabase\.auth\.getSession$$$$/g,
      `const { data, error } = await supabase.auth.getUser()`,
    )
  }

  // Replace session check with user check
  if (content.includes("!session")) {
    content = content.replace(/if\s+$$\s*!session\s*$$/g, `if (error || !data.user)`)
  }

  fs.writeFileSync(filePath, content)
  console.log(`Updated: ${filePath}`)
}

// Function to recursively process directories
function processDirectory(directory) {
  const files = fs.readdirSync(directory)

  for (const file of files) {
    const fullPath = path.join(directory, file)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      processDirectory(fullPath)
    } else if (file === "route.ts" || file === "route.js") {
      updateFile(fullPath)
    }
  }
}

// Start processing
processDirectory(apiRoutesDir)
console.log("All API routes updated successfully!")
