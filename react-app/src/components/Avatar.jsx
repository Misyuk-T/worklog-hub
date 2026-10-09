import {
  AvatarBadge,
  Text,
  Avatar as ChakraAvatar,
  Flex,
  Button,
} from "@chakra-ui/react";
import { logoutUser, openLoginPopup } from "../actions/auth";
import { DEMO_BUILD } from "../demo/demoMode";
import { SourceLink } from "../demo/DemoBanner";

const Avatar = ({ user }) => {
  const isDemo = DEMO_BUILD;

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
          <ChakraAvatar
            size="sm"
            name={user?.name || (isDemo ? "Demo User" : undefined)}
            src={user?.photo}
          >
            <AvatarBadge
              borderColor="papayawhip"
              boxSize="1em"
              bg={user || isDemo ? "green.500" : "tomato"}
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
          <Text fontSize="14px" fontWeight={700} textAlign="right" noOfLines={1}>
            {user ? user.name : isDemo ? "Demo user" : "Login to continue"}
          </Text>
        </Flex>
      </Flex>
      {isDemo ? (
        <SourceLink
          boxShadow="sm"
          size="sm"
          height="100%"
          colorScheme="teal"
          opacity={0.8}
        />
      ) : (
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
      )}
    </Flex>
  );
};

export default Avatar;
