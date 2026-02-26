import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Button,
  Divider,
  Flex,
  FormControl,
  FormErrorMessage,
  Stack,
  Text,
  useColorModeValue,
  Box,
} from "@chakra-ui/react";

import useWorkLogsStore from "../../../store/worklogsStore";
import FileUpload from "./FileUpload";
import RadioGroup from "./RadioGroup";
import { sendWorkLogs } from "../../../actions/workLogs";

const validateFiles = (value) => {
  if (!value || value.length < 1) return "File is required";

  for (const file of Array.from(value)) {
    const fsMb = file.size / (1024 * 1024);
    const MAX_FILE_SIZE = 10;
    if (fsMb > MAX_FILE_SIZE) return "Max file size is 10 MB";
  }

  return true;
};

const Form = () => {
  const { addWorkLogs, addWorkLogsError, resetWorkLogs, setIsJiraExport } =
    useWorkLogsStore();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isValid },
    resetField,
  } = useForm();

  const [isSent, setIsSent] = useState(false);

  const border = useColorModeValue("gray.200", "gray.700");
  const subtle = useColorModeValue("gray.600", "gray.400");
  const sectionBg = useColorModeValue("gray.50", "gray.800");

  const onSubmit = handleSubmit(async (data) => {
    const formData = new FormData();
    const isJiraType = data.type === "jira";

    formData.append("file", data.file[0]);
    formData.append("type", data.type);

    await sendWorkLogs(formData)
      .then((resp) => {
        resp && addWorkLogs(resp);
        setIsSent(true);
        setIsJiraExport(isJiraType);
      })
      .catch((error) => {
        console.error("Error: ", error);
        addWorkLogsError(error);
      });
  });

  return (
    <Box
      as="form"
      onSubmit={onSubmit}
      method="post"
      encType="multipart/form-data"
      w="full"
    >
      <Stack gap={4}>
        <Stack
          borderWidth="1px"
          borderColor={border}
          borderRadius="0"
          p={4}
          bg={sectionBg}
          gap={3}
        >
          <Flex align="center" justify="space-between" gap={3}>
            <Text
              fontSize="xs"
              fontWeight={700}
              letterSpacing="0.08em"
              textTransform="uppercase"
              color={subtle}
            >
              FILE
            </Text>
            <Text fontSize="sm" color={subtle} whiteSpace="nowrap">
              Max 10 MB
            </Text>
          </Flex>

          <FormControl isInvalid={!!errors.file} isRequired>
            <Text fontSize="sm" fontWeight={600} m={0} mb={2}>
              Choose a file
            </Text>

            <FileUpload
              accept={"text"}
              onReset={() => {
                resetField("file");
                setIsSent(false);
                resetWorkLogs();
              }}
              register={register("file", { validate: validateFiles })}
            />

            <FormErrorMessage mt={2} fontSize="sm">
              {errors.file && errors.file.message}
            </FormErrorMessage>
          </FormControl>
        </Stack>

        <Stack
          borderWidth="1px"
          borderColor={border}
          borderRadius="0"
          p={4}
          gap={3}
        >
          <Text
            fontSize="xs"
            fontWeight={700}
            letterSpacing="0.08em"
            textTransform="uppercase"
            color={subtle}
          >
            FILE TYPE
          </Text>

          <FormControl isInvalid={!!errors.type} isRequired>
            <Text fontSize="sm" fontWeight={600} m={0} mb={2}>
              Choose file type
            </Text>

            <RadioGroup control={control} onToggle={setIsSent} />

            <FormErrorMessage mt={2} fontSize="sm">
              {errors?.type && errors.type.message}
            </FormErrorMessage>
          </FormControl>
        </Stack>

        <Divider />

        <Flex justify="flex-end">
          <Button
            bg="gray.900"
            color="white"
            _hover={{ bg: "gray.800" }}
            borderRadius="0"
            h="34px"
            isLoading={isSubmitting}
            type="submit"
            isDisabled={isSent || !isValid}
            size="sm"
            px={5}
          >
            Import
          </Button>
        </Flex>
      </Stack>
    </Box>
  );
};

export default Form;
