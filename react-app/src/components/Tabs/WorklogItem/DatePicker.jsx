import { DayPicker } from "react-day-picker";
import { Controller } from "react-hook-form";
import {
  PopoverBody,
  useDisclosure,
  Popover,
  PopoverTrigger,
  Text,
  Portal,
  PopoverContent,
} from "@chakra-ui/react";

import { getFormattedStringDate } from "../../../helpers/getFormattedDate";

const DatePicker = ({ defaultValue, value, onChange, control }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <Popover
      placement="bottom-start"
      isOpen={isOpen}
      onOpen={onOpen}
      onClose={onClose}
    >
      <PopoverTrigger>
        <Text m={0} w="50%" cursor="pointer">
          <strong>Date: </strong>
          {getFormattedStringDate(value) || defaultValue}
        </Text>
      </PopoverTrigger>
      <Portal>
        <PopoverContent>
          <PopoverBody>
            <Controller
              name="date"
              defaultValue={defaultValue}
              control={control}
              render={({ field }) => {
                return (
                  <DayPicker
                    {...field}
                    ref={null}
                    placeholderText="Select date"
                    selected={field.value}
                    showOutsideDays
                    mode="single"
                    defaultMonth={field.value}
                    onDayClick={(date) => {
                      onChange(date);
                      onClose();
                    }}
                  />
                );
              }}
            />
          </PopoverBody>
        </PopoverContent>
      </Portal>
    </Popover>
  );
};

export default DatePicker;
