import {
  AvatarBadge,
  Text,
  Avatar as ChakraAvatar,
  Flex,
  Button,
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
    <Flex gap={0}>
      <Flex
        gap={1}
        boxShadow="sm"
        p={"5px 12px"}
        flex={1}
        alignItems="center"
        minW={0}
        bg="white"
        borderRadius="0"
        borderWidth="1px"
        borderColor="gray.200"
      >
        <Flex flex="1" alignItems="center" gap={2} minW={0}>
          <ChakraAvatar size="sm" name={user?.name || "name"} src={user?.photo}>
            <AvatarBadge
              borderColor="papayawhip"
              boxSize="1em"
              bg={user ? "green.500" : "tomato"}
            />
          </ChakraAvatar>
        </Flex>
        <Flex
          flex="1"
          alignItems="center"
          justifyContent="flex-end"
          minW={0}
          p={"0 8px"}
        >
          <Text fontSize="xs" fontWeight={700} textAlign="right" noOfLines={1}>
            {user ? user.name : "Login to continue"}
          </Text>
        </Flex>
      </Flex>
      <Button
        onClick={handleClick}
        boxShadow="sm"
        size="sm"
        height="100%"
        borderRadius="0"
        colorScheme={user ? "red" : "teal"}
        opacity={0.8}
      >
        {user ? "Logout" : "Login"}
      </Button>
    </Flex>
  );
};

export default Avatar;
