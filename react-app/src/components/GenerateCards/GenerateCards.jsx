import { useState } from "react";
import {
  RadioGroup,
  Radio,
  Stack,
  Button,
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
    if (selectedSource === "jira") {
      onJiraOpen();
    } else if (selectedSource === "clickup") {
      onClickUpOpen();
    } else if (selectedSource === "file") {
      onFileOpen();
    } else if (selectedSource === "redmine") {
      console.log("Redmine not ready yet.");
    }
  };

  return (
    <Stack
      bg={"white"}
      boxShadow={"sm"}
      justifyContent={"space-between"}
      p={"10px"}
      px={"20px"}
      borderRadius={"5px"}
      height={"93px"}
      gap={0}
    >
      <Button
        colorScheme="blue"
        onClick={handleGenerate}
        fontSize={"13px"}
        mt={"2px"}
        isDisabled={isDisabled}
      >
        Generate cards from
      </Button>

      <RadioGroup onChange={setSelectedSource} value={selectedSource}>
        <Stack
          direction="row"
          spacing={5}
          sx={{
            "*": {
              fontSize: "14px",
            },
          }}
        >
          <Radio value="jira" fontSize={"14px"}>
            Jira
          </Radio>
          <Radio value="clickup" fontSize={"14px"}>
            ClickUp
          </Radio>
          <Radio value="file">File</Radio>
          <Radio value="redmine" fontSize={"13px"} isDisabled>
            Redmine
          </Radio>
        </Stack>
      </RadioGroup>

      <JiraModal isOpen={isJiraOpen} onClose={onJiraClose} />
      <ClickUpModal isOpen={isClickUpOpen} onClose={onClickUpClose} />

      <Modal isOpen={isFileOpen} onClose={onFileClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Import from File</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Form />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Stack>
  );
};

export default GenerateCards;
