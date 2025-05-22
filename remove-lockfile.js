const fs = require("fs")
const path = require("path")

// Check if pnpm-lock.yaml exists in the current directory
const lockfilePath = path.join(process.cwd(), "pnpm-lock.yaml")

if (fs.existsSync(lockfilePath)) {
  console.log("Found pnpm-lock.yaml file")

  // Delete the lockfile
  fs.unlinkSync(lockfilePath)
  console.log("Successfully deleted pnpm-lock.yaml")
} else {
  console.log("No pnpm-lock.yaml file found in the current directory")
}

// Check for other potential lockfiles
const otherLockfiles = ["package-lock.json", "yarn.lock", ".pnpm-store"]

otherLockfiles.forEach((file) => {
  const filePath = path.join(process.cwd(), file)
  if (fs.existsSync(filePath)) {
    console.log(`Found other lockfile: ${file}`)
    // We're not deleting these automatically, just reporting
  }
})

// List all files in the root directory for reference
console.log("\nFiles in the current directory:")
const files = fs.readdirSync(process.cwd())
files.forEach((file) => {
  console.log(`- ${file}`)
})
