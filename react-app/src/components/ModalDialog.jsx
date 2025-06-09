import { useState } from "react";

import {
  Box,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
} from "@chakra-ui/react";

const ModalDialog = ({ trigger, children, onConfirm, headerTitle }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <>
      <Box onClick={onOpen}>{trigger}</Box>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{headerTitle}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>{children}</ModalBody>

          <ModalFooter>
            <Button variant="ghost" colorScheme="red" onClick={onClose}>
              Close
            </Button>
            <Button
              colorScheme="teal"
              mr={3}
              isLoading={isLoading}
              loadingText="Submitting..."
              onClick={async () => {
                setIsLoading(true);
                await onConfirm();
                setIsLoading(false);
                onClose();
              }}
            >
              Confirm
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ModalDialog;
