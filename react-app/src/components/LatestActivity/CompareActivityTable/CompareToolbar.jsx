import { useId } from "react";
import {
  Box,
  Button,
  Flex,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverTrigger,
  Portal,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { CalendarIcon } from "@chakra-ui/icons";
import { DayPicker } from "react-day-picker";

import { formatRange, getRangePresets } from "../../../helpers/dateRangePresets";
import PersonPicker from "./PersonPicker";
import ResolutionPanel from "./ResolutionPanel";

const SERVICE_COLORS = { redmine: "orange", jira: "blue", clickup: "purple" };

const ServiceChips = ({ label, services, selected, onToggle }) => (
  <Flex align="center" gap={2} wrap="wrap" role="group" aria-label={label}>
    <Text fontSize="14px" fontWeight={600} minW="60px">
      {label}
    </Text>
    {services.map((service) => {
      const pressed = selected.includes(service.key);
      return (
        <Button
          key={service.key}
          size="sm"
          h="32px"
          borderRadius={0}
          colorScheme={SERVICE_COLORS[service.key]}
          variant={pressed ? "solid" : "outline"}
          aria-pressed={pressed}
          isDisabled={!service.available}
          onClick={() => onToggle(service.key)}
        >
          {service.label}
        </Button>
      );
    })}
  </Flex>
);

const PRESET_LABELS = [
  ["thisWeek", "This week"],
  ["lastWeek", "Last week"],
  ["thisMonth", "This month"],
];

const DateRangeButton = ({ range, onChange }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const presets = getRangePresets();

  return (
    <Popover isOpen={isOpen} onOpen={onOpen} onClose={onClose} isLazy placement="bottom-start">
      <PopoverTrigger>
        <Button
          leftIcon={<CalendarIcon />}
          variant="outline"
          size="sm"
          h="32px"
          borderRadius={0}
          fontWeight={500}
          aria-label={`Dates: ${formatRange(range)}`}
        >
          {formatRange(range)}
        </Button>
      </PopoverTrigger>
      <Portal>
        <PopoverContent borderRadius={0} w="auto">
          <PopoverArrow />
          <PopoverCloseButton />
          <PopoverBody>
            <Flex gap={2} wrap="wrap" mb={2} pr={6}>
              {PRESET_LABELS.map(([key, text]) => (
                <Button
                  key={key}
                  size="sm"
                  h="32px"
                  borderRadius={0}
                  variant="outline"
                  onClick={() => {
                    onChange(presets[key]);
                    onClose();
                  }}
                >
                  {text}
                </Button>
              ))}
            </Flex>
            <DayPicker
              mode="range"
              selected={range}
              onSelect={onChange}
              defaultMonth={range?.from}
              weekStartsOn={1}
            />
          </PopoverBody>
        </PopoverContent>
      </Portal>
    </Popover>
  );
};

const CompareToolbar = ({
  person,
  onPersonChange,
  activePreset,
  resolution,
  services,
  source1Services,
  source2Services,
  onToggleSource1,
  onToggleSource2,
  range,
  onRangeChange,
  onCompare,
  loading,
  compareDisabled,
}) => {
  const pickerId = useId();

  return (
    <Box
      borderWidth="1px"
      borderColor="gray.300"
      bg="white"
      p={3}
      mb={4}
    >
      <Flex align={{ md: "center" }} gap={2} direction={{ base: "column", md: "row" }}>
        <Text as="label" htmlFor={pickerId} fontSize="14px" fontWeight={600} minW="120px">
          Whose logs
        </Text>
        <Box flex="1" maxW={{ md: "520px" }} w="100%">
          <PersonPicker
            key={activePreset?.id}
            inputId={pickerId}
            person={person}
            onChange={onPersonChange}
            credentials={activePreset}
          />
        </Box>
      </Flex>

      {person && <ResolutionPanel person={person} resolution={resolution} />}

      <Flex
        mt={3}
        gap={3}
        align={{ lg: "center" }}
        direction={{ base: "column", lg: "row" }}
        wrap="wrap"
      >
        <ServiceChips
          label="Source A"
          services={services}
          selected={source1Services}
          onToggle={onToggleSource1}
        />
        <Text fontSize="14px" fontWeight={600} color="gray.600" aria-hidden="true">
          vs
        </Text>
        <ServiceChips
          label="Source B"
          services={services}
          selected={source2Services}
          onToggle={onToggleSource2}
        />
        <Flex gap={3} align="center" wrap="wrap" ml={{ lg: "auto" }}>
          <DateRangeButton range={range} onChange={onRangeChange} />
          <Button
            colorScheme="blue"
            size="sm"
            h="32px"
            borderRadius={0}
            onClick={onCompare}
            isLoading={loading}
            isDisabled={compareDisabled}
          >
            Compare
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
};

export default CompareToolbar;
