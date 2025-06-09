import {
  Box,
  Flex,
  FormLabel,
  IconButton,
  Input,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  Popover,
  PopoverTrigger,
  PopoverArrow,
  InputLeftAddon,
  InputRightAddon,
  InputGroup,
  Text,
} from "@chakra-ui/react";
import { InfoIcon, DeleteIcon, AddIcon } from "@chakra-ui/icons";
import { useEffect } from "react";

const SettingModalFieldItem = ({
  register,
  name,
  id,
  children,
  leftAddon,
  rightAddon,
  errors,
  remove,
  isDynamic,
  append,
  showAddButton,
}) => {
  useEffect(() => {
    document.activeElement.blur();
  }, []);

  return (
    <Box width="100%">
      <Flex alignItems="center">
        <FormLabel m={0} htmlFor={id} color={isDynamic ? "blue" : "black"}>
          {name}
        </FormLabel>

        {children && (
          <Popover>
            <PopoverTrigger>
              <IconButton
                p={0}
                h="15px"
                w="10px"
                background="transparent"
                aria-label="helper popup"
                icon={<InfoIcon />}
                transition="all .3s"
                _hover={{
                  background: "transparent",
                  svg: {
                    opacity: "0.5",
                  },
                }}
              />
            </PopoverTrigger>
            <PopoverContent width="100%" p={5}>
              <PopoverArrow />
              <PopoverCloseButton />
              <PopoverHeader fontWeight={600} fontSize={18}>
                How to get:
              </PopoverHeader>
              <PopoverBody>{children}</PopoverBody>
            </PopoverContent>
          </Popover>
        )}
      </Flex>

      <InputGroup size="sm">
        {leftAddon && <InputLeftAddon>{leftAddon}</InputLeftAddon>}
        <Input
          type="text"
          id={id}
          {...register(id, { required: !isDynamic })}
          isInvalid={errors[id]}
        />
        {rightAddon && <InputRightAddon>{rightAddon}</InputRightAddon>}

        {isDynamic && (
          <Flex ml={2}>
            <IconButton
              size="xl"
              colorScheme={"red"}
              variant={"outline"}
              w={"32px"}
              h={"32px"}
              icon={<DeleteIcon />}
              onClick={remove}
              aria-label="Delete URL"
            />
            {showAddButton && (
              <IconButton
                ml={1}
                variant={"outline"}
                colorScheme={"teal"}
                size="xl"
                w={"32px"}
                h={"32px"}
                icon={<AddIcon />}
                onClick={append}
                aria-label="Add URL"
              />
            )}
          </Flex>
        )}
      </InputGroup>

      {errors[id] && (
        <Text fontSize="sm" color="tomato">
          This field is required.
        </Text>
      )}
    </Box>
  );
};

export default SettingModalFieldItem;
