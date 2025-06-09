import { Box } from "@chakra-ui/react";

const BoxOverlay = ({ bgColor, children, ...rest }) => (
  <Box
    sx={{
      position: "absolute",
    }}
    bgColor={bgColor}
    height="100%"
    width="100vw"
    left={0}
    top={0}
    ml="calc((-100vw + 100%) / 2)"
    zIndex={-3}
    {...rest}
  >
    {children}
  </Box>
);

export default BoxOverlay;
