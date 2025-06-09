import { Flex, Link, Text } from "@chakra-ui/react";

const Footer = () => (
  <Flex
    as="footer"
    role="contentinfo"
    justifyContent="flex-end"
    mb={"20px"}
    mr={"40px"}
  >
    <Text fontSize="sm" color="fg.subtle">
      Report issues or share your ideas{" "}
      <Link
        color="blue.400"
        target="_blank"
        href="https://github.com/Misyuk-T/redmine-application/issues"
      >
        here
      </Link>
    </Text>
  </Flex>
);

export default Footer;
