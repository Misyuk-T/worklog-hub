import { useRef, useState } from "react";
import { Box, Button, Icon, InputGroup, Text } from "@chakra-ui/react";
import { AttachmentIcon, DeleteIcon } from "@chakra-ui/icons";

const FileUpload = ({ register, accept, multiple, onReset }) => {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState("");

  const { ref, ...rest } = register;

  const handleClick = () => inputRef.current?.click();

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    setFileName(file.name);
    register.onChange(e);
  };

  const handleClearFile = (e) => {
    setFileName("");
    onReset();
    e.stopPropagation();
  };

  return (
    <InputGroup onClick={handleClick}>
      <Box
        as="input"
        type="file"
        multiple={multiple || false}
        hidden
        accept={accept}
        {...rest}
        ref={(e) => {
          ref(e);
          inputRef.current = e;
        }}
        onChange={handleFileChange}
      />
      {fileName ? (
        <Button
          w={146}
          pl={2}
          onClick={handleClearFile}
          rightIcon={<Icon color="tomato" as={DeleteIcon} />}
          border="1px solid black"
        >
          <Text noOfLines={1} display="block" fontSize="sm">
            {fileName}
          </Text>
        </Button>
      ) : (
        <Button
          w={110}
          border="1px solid black"
          fontSize="13px"
          h="30px"
          leftIcon={<Icon as={AttachmentIcon} />}
        >
          Upload File
        </Button>
      )}
    </InputGroup>
  );
};

export default FileUpload;
