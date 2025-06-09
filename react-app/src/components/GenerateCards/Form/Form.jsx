import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Button,
  Card,
  CardBody,
  Flex,
  FormControl,
  FormErrorMessage,
  Stack,
  Text,
} from "@chakra-ui/react";

import useWorkLogsStore from "../../../store/worklogsStore";

import FileUpload from "./FileUpload";
import RadioGroup from "./RadioGroup";

import { sendWorkLogs } from "../../../actions/workLogs";

const validateFiles = (value) => {
  if (!value || value.length < 1) {
    return "Files is required";
  }
  for (const file of Array.from(value)) {
    const fsMb = file.size / (1024 * 1024);
    const MAX_FILE_SIZE = 10;
    if (fsMb > MAX_FILE_SIZE) {
      return "Max file size 10mb";
    }
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

  const onSubmit = handleSubmit(async (data) => {
    const formData = new FormData();
    const isJiraType = data.type === "jira";

    formData.append("file", data.file[0]);
    formData.append("type", data.type);

    await sendWorkLogs(formData)
      .then((data) => {
        data && addWorkLogs(data);
        setIsSent(true);
        setIsJiraExport(isJiraType);
      })
      .catch((error) => {
        console.error("Error: ", error);
        addWorkLogsError(error);
      });
  });

  return (
    <Card
      as="form"
      position="relative"
      onSubmit={onSubmit}
      method="post"
      encType="multipart/form-data"
      width="fit-content"
      alignSelf="baseline"
      boxShadow={"none"}
      padding={0}
    >
      <CardBody
        as={Stack}
        justifyContent="space-between"
        padding={0}
        pb={"20px"}
      >
        <Flex
          alignItems="end"
          flexWrap="wrap"
          justifyContent="space-between"
          gap="13px"
          w="100%"
        >
          <Flex gap="15px">
            <FormControl
              as={Flex}
              flexDirection="column"
              justifyContent="space-between"
              isInvalid={!!errors.file}
              isRequired
              width="130px"
              px={2}
            >
              <Text
                position="absolute"
                as={FormErrorMessage}
                fontSize="sm"
                color="tomato"
                top="12px"
              >
                {errors.file && errors?.file.message}
              </Text>
              <Text fontSize="md" fontWeight={500} whiteSpace="nowrap" m={0}>
                Choose a file:
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
            </FormControl>

            <FormControl isInvalid={!!errors.type}>
              <Text fontSize="md" whiteSpace="nowrap" m={0} fontWeight={500}>
                Choose file type:
              </Text>
              <RadioGroup control={control} onToggle={setIsSent} />

              <Text as={FormErrorMessage} fontSize="md" color="tomato">
                {errors?.type && errors.type.message}
              </Text>
            </FormControl>
          </Flex>

          <Button
            flexShrink={0}
            colorScheme="teal"
            isLoading={isSubmitting}
            type="submit"
            isDisabled={isSent || !isValid}
            fontSize="13px"
            h="30px"
          >
            Import
          </Button>
        </Flex>
      </CardBody>
    </Card>
  );
};

export default Form;
