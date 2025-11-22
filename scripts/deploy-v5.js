const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying ChatDAppV5 to Celo Alfajores...\n");

  // Get the contract factory
  const ChatDAppV5 = await hre.ethers.getContractFactory("ChatDAppV5");

  console.log("📝 Deploying contract...");

  // Deploy the contract
  const chatDApp = await ChatDAppV5.deploy();

  // Wait for deployment to finish
  await chatDApp.deployed();

  console.log("\n✅ ChatDAppV5 deployed successfully!");
  console.log("📍 Contract Address:", chatDApp.address);
  console.log("\n📋 Next Steps:");
  console.log("1. Copy the contract address above");
  console.log("2. Update your .env.local file:");
  console.log(`   NEXT_PUBLIC_CONTRACT_ADDRESS=${chatDApp.address}`);
  console.log("3. Start the WebSocket server:");
  console.log("   cd server && node server-v2.js");
  console.log("4. Start your Next.js app:");
  console.log("   npm run dev");
  console.log("\n🔍 Verify contract on Celo Explorer:");
  console.log(`   https://alfajores.celoscan.io/address/${chatDApp.address}`);
  console.log("\n🎉 Deployment Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
