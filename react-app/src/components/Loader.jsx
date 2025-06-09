import { Spinner, Center } from "@chakra-ui/react";

const Loader = ({ isVisible, isFixed = false }) => {
  if (isFixed && isVisible) {
    return (
      <Center
        position="fixed"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        zIndex="9999"
        bgColor="rgba(255, 255, 255, 0.8)"
        height="100vh"
        width="100vw"
      >
        <Spinner size="xl" color="blue.500" />
      </Center>
    );
  }

  return isVisible ? (
    <Center
      position="absolute"
      top="50%"
      left="50%"
      transform="translate(-50%, -50%)"
      zIndex="9999"
      bgColor="rgba(255, 255, 255, 0.8)"
      height="100%"
      width="100%"
    >
      <Spinner size="xl" color="blue.500" />
    </Center>
  ) : null;
};

export default Loader;
