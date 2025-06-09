import {
  AvatarBadge,
  Stack,
  Text,
  Avatar as ChakraAvatar,
  Flex,
  Button,
  Box,
} from "@chakra-ui/react";
import { logoutUser, openLoginPopup } from "../actions/auth";

const Avatar = ({ user }) => {
  const handleClick = async () => {
    if (user) {
      await logoutUser();
    } else {
      await openLoginPopup();
    }
  };

  return (
    <Flex gap="10px">
      <Flex
        gap={1}
        boxShadow="sm"
        p={1}
        w="100%"
        alignItems="center"
        bg="white"
        borderRadius={5}
      >
        <ChakraAvatar size="sm" name={user?.name || "name"} src={user?.photo}>
          <AvatarBadge
            borderColor="papayawhip"
            boxSize="1em"
            bg={user ? "green.500" : "tomato"}
          />
        </ChakraAvatar>

        <Stack alignItems="center" gap={0} w="100%">
          <Text fontSize="xs" fontWeight={700} textAlign="center">
            {user ? user.name : "Login to continue"}
          </Text>
        </Stack>
      </Flex>
      <Box>
        <Button
          onClick={handleClick}
          boxShadow="sm"
          size="sm"
          height="100%"
          colorScheme={user ? "red" : "teal"}
          opacity={0.8}
        >
          {user ? "Logout" : "Login"}
        </Button>
      </Box>
    </Flex>
  );
};

export default Avatar;
