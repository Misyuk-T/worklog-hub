import { EditIcon } from "@chakra-ui/icons";
import {
  IconButton,
  Popover,
  PopoverTrigger,
  Portal,
  PopoverContent,
  PopoverBody,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { getCorrectGMTDateObject } from "../../helpers/getFormattedDate";

const DayDatePicker = ({ date, onMove }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const selectedDate = getCorrectGMTDateObject(date);

  return (
    <Popover
      isOpen={isOpen}
      onOpen={onOpen}
      onClose={onClose}
      placement="bottom-start"
    >
      <PopoverTrigger>
        <IconButton
          aria-label={`Change date of ${date}`}
          icon={<EditIcon />}
          size="xs"
          variant="ghost"
          borderRadius={0}
          position="absolute"
          right="4px"
          top="9px"
        />
      </PopoverTrigger>
      <Portal>
        <PopoverContent
          borderRadius={0}
          maxW="calc(100vw - 24px)"
          // Portaled calendar keys must not reach the tab list's arrow navigation.
          onKeyDown={(event) => event.stopPropagation()}
        >
          <PopoverBody>
            <Text fontSize="sm">
              Moves every saved card in this day. Unsaved card edits are discarded
              when moving to another date.
            </Text>
            <DayPicker
              mode="single"
              selected={selectedDate}
              defaultMonth={selectedDate}
              styles={{ root: { margin: 0 }, head_cell: { fontSize: "14px" } }}
              showOutsideDays
              initialFocus
              onSelect={(nextDate) => {
                if (!nextDate) return;
                onClose();
                onMove(date, format(nextDate, "dd-MM-yyyy"));
              }}
            />
          </PopoverBody>
        </PopoverContent>
      </Portal>
    </Popover>
  );
};

export default DayDatePicker;
