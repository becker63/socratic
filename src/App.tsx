// src/App.tsx
import React from "react";
import { Box, Button, Input, Text } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useDebate } from "./hooks/useDebate";
import { useDebateProjection } from "./hooks/useDebateProjection";
import { useLayoutStable } from "./hooks/useLayoutStable";
import { useObserverAnchor } from "./hooks/useObserverAnchor";
import { useGradientProjection } from "./hooks/useGradientProjection";
import { useScrollOwnership } from "./hooks/useScrollOwnership";
import { useAutoScroll } from "./hooks/useAutoScroll";
import { MdxRenderer } from "./components/MdxRenderer";
import { bus } from "./bus";

const MotionBox = motion(Box);

export function App({ inspector }: { inspector?: any }) {
  const { prompt, setPrompt, loading, state, send, generate, replay } =
    useDebate(inspector?.inspect);

  const blocks = useDebateProjection();

  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  // 1️⃣ Wait for layout (MDX + Mermaid) to stabilize
  const { ready: layoutReady } = useLayoutStable(scrollRef, blocks);

  // 2️⃣ Attach observer to bottom of content
  const { observerRef, observerMetrics } = useObserverAnchor(
    scrollRef,
    layoutReady,
  );

  // 3️⃣ Project observer geometry into gradient intensity
  const { intensity } = useGradientProjection(observerMetrics, layoutReady);

  // Extract scroll owner from state machine
  const scrollOwner =
    typeof state.value === "object" && "scroll" in state.value
      ? state.value.scroll
      : "machineOwned";

  // 4️⃣ Auto-scroll (returns restoringRef)
  const restoringRef = useAutoScroll(
    scrollRef,
    blocks.length,
    scrollOwner,
    layoutReady,
  );

  // 5️⃣ Ownership (suppressed while restoring)
  useScrollOwnership(send, scrollRef, restoringRef);

  return (
    <Box
      height="100vh"
      bg="#0d0f14"
      color="#e6e8ec"
      fontSize="17px"
      lineHeight="1.8"
      display="flex"
      flexDirection="column"
    >
      {/* Prompt Bar */}
      <Box
        position="sticky"
        top="0"
        zIndex="10"
        px="48px"
        py="20px"
        display="flex"
        gap="14px"
        backdropFilter="blur(12px)"
        bg="rgba(13,15,20,0.78)"
        borderBottom="1px solid rgba(255,255,255,0.05)"
      >
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Zero trust in microservices…"
          bg="rgba(255,255,255,0.05)"
          border="1px solid rgba(255,255,255,0.08)"
          _focus={{ borderColor: "rgba(120,170,255,0.6)" }}
        />

        <Button
          onClick={generate}
          loading={loading}
          bg="rgba(255,255,255,0.08)"
          _hover={{ bg: "rgba(255,255,255,0.14)" }}
        >
          Generate
        </Button>

        <Button
          variant="outline"
          onClick={replay}
          disabled={!state.context.dialogue}
          border="1px solid rgba(255,255,255,0.1)"
        >
          Replay
        </Button>
      </Box>

      {/* Debate Stage Wrapper */}
      <Box flex="1" position="relative">
        {/* Scroll Viewport */}
        <Box
          ref={scrollRef}
          position="absolute"
          inset="0"
          overflowY="auto"
          data-testid="scroll-viewport"
          data-layout-ready={layoutReady ? "true" : "false"}
          data-scroll-owner={state.value.scroll}
        >
          {/* Content Wrapper */}
          <Box pt="160px" pb="160px">
            {blocks.map((block, i) => (
              <TurnRow key={block.id} block={block} index={i} />
            ))}

            {/* 2️⃣ Observer Anchor — must be last in content */}
            <Box
              ref={observerRef}
              data-testid="observer-anchor"
              height="1px"
              width="100%"
            />
          </Box>
        </Box>

        {/* 3️⃣ Bottom Gradient — fixed to viewport bottom */}
        <Box
          pointerEvents="none"
          data-testid="background-gradient"
          data-intensity={intensity.toFixed(4)}
          position="absolute"
          bottom="0"
          left="0"
          right="0"
          height="44px"
          bg={`linear-gradient(
            to top,
            rgba(120,170,255, ${0.32 * intensity}) 0%,
            rgba(120,170,255, ${0.18 * intensity}) 55%,
            rgba(120,170,255, 0) 100%
          )`}
        />
      </Box>
    </Box>
  );
}

function TurnRow({ block, index }: { block: any; index: number }) {
  return (
    <Box
      display="grid"
      gridTemplateColumns={{ base: "1fr", md: "1fr 1fr" }}
      px={{ base: "6vw", md: "8vw" }}
      py="100px"
      mt={index > 0 ? "-30px" : "0px"}
      position="relative"
    >
      <Pane
        side="left"
        speaker={block.speaker}
        active="security_engineer"
        block={block}
      />
      <Pane
        side="right"
        speaker={block.speaker}
        active="application_engineer"
        block={block}
      />
    </Box>
  );
}

function Pane({
  side,
  speaker,
  active,
  block,
}: {
  side: "left" | "right";
  speaker: string;
  active: string;
  block: any;
}) {
  const isActive = speaker === active;

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent={
        side === "left" ? "flex-start" : { base: "flex-start", md: "flex-end" }
      }
      minH={{ base: "auto", md: "320px" }}
    >
      {isActive ? (
        <MeasuredBubble id={block.id} content={block.mdx} speaker={speaker} />
      ) : (
        <Box height={block.height ? `${block.height}px` : "0px"} />
      )}
    </Box>
  );
}

function MeasuredBubble({
  id,
  content,
  speaker,
}: {
  id: string;
  content: string;
  speaker: string;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!ref.current) return;

    const el = ref.current;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        bus.emit("TURN_RENDERED", {
          id,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [id]);

  const isSecurity = speaker === "security_engineer";

  return (
    <MotionBox
      data-testid="turn-bubble"
      ref={ref}
      transition={{ duration: 0.4, ease: "easeOut" }}
      width="70vw"
      maxW="1100px"
      fontSize="18px"
      borderLeft={isSecurity ? "3px solid rgba(120,170,255,0.35)" : undefined}
      borderRight={!isSecurity ? "3px solid rgba(255,180,120,0.35)" : undefined}
      pl={isSecurity ? "28px" : undefined}
      pr={!isSecurity ? "24px" : undefined}
      display={!isSecurity ? "flex" : "block"}
      flexDirection="column"
      alignItems={!isSecurity ? "flex-end" : undefined}
    >
      <Text
        fontSize="13px"
        letterSpacing="0.08em"
        textTransform="uppercase"
        opacity="0.6"
        mb="16px"
      >
        {isSecurity ? "Security Engineer" : "Application Engineer"}
      </Text>

      <Box width="100%" textAlign="left">
        <MdxRenderer content={content} />
      </Box>
    </MotionBox>
  );
}
