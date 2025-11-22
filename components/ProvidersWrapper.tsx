"use client";

import { WebSocketProvider } from "@/context/WebSocketContext";
import { useWeb3 } from "@/context/Web3ContextV4";
import ParticlesBackground from "@/components/ParticlesBackground";

export default function ProvidersWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { account } = useWeb3();

  return (
    <>
      <WebSocketProvider walletAddress={account}>
        <ParticlesBackground />
        {children}
      </WebSocketProvider>
    </>
  );
}
