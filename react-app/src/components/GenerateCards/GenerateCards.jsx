import { useState } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Stack,
  Text,
  useColorModeValue,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
} from "@chakra-ui/react";

import JiraModal from "./Jira/JiraModal";
import ClickUpModal from "./ClickUp/ClickUpModal";
import Form from "./Form/Form";

const SOURCES = [
  { key: "jira", label: "Jira" },
  { key: "clickup", label: "ClickUp" },
  { key: "file", label: "File" },
  { key: "redmine", label: "Redmine", disabled: true },
];

const GenerateCards = ({ isDisabled }) => {
  const [selectedSource, setSelectedSource] = useState("jira");

  const {
    isOpen: isFileOpen,
    onOpen: onFileOpen,
    onClose: onFileClose,
  } = useDisclosure();

  const {
    isOpen: isJiraOpen,
    onOpen: onJiraOpen,
    onClose: onJiraClose,
  } = useDisclosure();

  const {
    isOpen: isClickUpOpen,
    onOpen: onClickUpOpen,
    onClose: onClickUpClose,
  } = useDisclosure();

  const handleGenerate = () => {
    if (selectedSource === "jira") onJiraOpen();
    else if (selectedSource === "clickup") onClickUpOpen();
    else if (selectedSource === "file") onFileOpen();
    else if (selectedSource === "redmine")
      console.log("Redmine not ready yet.");
  };

  const bg = useColorModeValue("white", "gray.900");
  const border = useColorModeValue("gray.200", "gray.700");
  const subtle = useColorModeValue("gray.600", "gray.400");
  const hoverBg = useColorModeValue("gray.100", "gray.700");
  const shadow = useColorModeValue("sm", "sm");

  const SourceTab = ({ value, label, disabled, isFirst, isLast }) => {
    const isActive = selectedSource === value;
    return (
      <Button
        size="sm"
        onClick={() => setSelectedSource(value)}
        isDisabled={disabled}
        flex={1}
        minW={0}
        borderRadius="0"
        h="34px"
        px={4}
        fontWeight={600}
        bg={isActive ? "gray.900" : "transparent"}
        color={isActive ? "white" : "inherit"}
        borderWidth="1px"
        borderColor={border}
        _hover={{ bg: isActive ? "gray.800" : hoverBg }}
        opacity={disabled ? 0.5 : 1}
        ml={isFirst ? 0 : "-1px"}
        _focusVisible={{ boxShadow: "outline" }}
      >
        {label}
      </Button>
    );
  };

  return (
    <>
      <Flex
        direction="column"
        bg={bg}
        borderWidth="1px"
        borderColor={border}
        borderRadius="0"
        boxShadow={shadow}
        w="full"
        maxW="720px"
        minW={0}
      >
        <Flex
          align="center"
          justify="space-between"
          px={4}
          py={3}
          gap={3}
          minW={0}
        >
          <Stack spacing={0} minW={0}>
            <Text
              fontSize="xs"
              color={subtle}
              fontWeight={700}
              letterSpacing="0.08em"
              whiteSpace="nowrap"
            >
              GENERATE CARDS
            </Text>
            <Text fontSize="sm" color={subtle} noOfLines={1}>
              Select a source
            </Text>
          </Stack>

          <Button
            onClick={handleGenerate}
            isDisabled={isDisabled}
            size="sm"
            borderRadius="0"
            h="34px"
            bg="gray.900"
            color="white"
            _hover={{ bg: "gray.800" }}
            px={4}
            flex="0 0 auto"
          >
            Generate
          </Button>
        </Flex>

        <Box minW={0} px={4} pb={3}>
          <HStack spacing={0} w="100%">
            {SOURCES.map((s, i) => (
              <SourceTab
                key={s.key}
                value={s.key}
                label={s.label}
                disabled={s.disabled}
                isFirst={i === 0}
                isLast={i === SOURCES.length - 1}
              />
            ))}
          </HStack>
        </Box>
      </Flex>

      <JiraModal isOpen={isJiraOpen} onClose={onJiraClose} />
      <ClickUpModal isOpen={isClickUpOpen} onClose={onClickUpClose} />

      <Modal isOpen={isFileOpen} onClose={onFileClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent borderRadius="0" borderWidth="1px" borderColor={border}>
          <ModalHeader>Import from File</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Form />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default GenerateCards;
