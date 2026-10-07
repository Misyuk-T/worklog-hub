import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  Grid,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import { InfoOutlineIcon } from "@chakra-ui/icons";
import Select from "react-select";
import { toast } from "react-toastify";

import useWorkLogsStore from "../../../store/worklogsStore";
import useRedmineStore from "../../../store/redmineStore";
import useSettingsStore from "../../../store/settingsStore";
import useRedminePrefixMappings, {
  getMappingStorageKey,
} from "../../../hooks/useRedminePrefixMappings";
import {
  applyRedminePrefixMappings,
  detectRedminePrefixes,
} from "../../../helpers/redminePrefixMappings";
import { transformToProjectData } from "../../../helpers/transformToSelectData";

const columns = { base: "64px minmax(0, 1fr)", md: "90px minmax(0, 1fr) 90px" };

const RedminePrefixMappings = () => {
  const { workLogs, applyRedminePrefixMappings: applyMappings } =
    useWorkLogsStore();
  const { projects, user } = useRedmineStore();
  const { currentSettings } = useSettingsStore();
  const [onlyEmpty, setOnlyEmpty] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const storageKey = getMappingStorageKey({
    profileId: currentSettings?.id,
    redmineUrl: currentSettings?.redmineUrl,
    userId: user?.id,
  });
  const { mappings, setMapping, storageFailed } =
    useRedminePrefixMappings(storageKey);
  const options = transformToProjectData(projects);
  const detected = detectRedminePrefixes(workLogs);
  const counts = new Map(detected.map(({ prefix, count }) => [prefix, count]));
  const prefixes = [
    ...new Set([...counts.keys(), ...Object.keys(mappings)]),
  ].sort();
  const preview = applyRedminePrefixMappings(workLogs, mappings, projects, {
    onlyEmpty,
  });

  const handleApply = () => {
    const result = applyMappings(mappings, projects, { onlyEmpty });
    if (result.updatedCount) {
      toast.success(`Redmine task updated on ${result.updatedCount} card(s).`);
      onClose();
    } else {
      toast.info("All matching cards already have the selected Redmine task.");
    }
  };

  return (
    <>
      <Button
        onClick={onOpen}
        size="sm"
        variant="outline"
        colorScheme="teal"
        flexShrink={0}
        aria-haspopup="dialog"
      >
        Redmine mappings
        {Object.keys(mappings).length > 0 && (
          <Badge ml={2} colorScheme="teal" borderRadius="full" px={2}>
            {Object.keys(mappings).length}
          </Badge>
        )}
      </Button>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="2xl"
        scrollBehavior="outside"
      >
        <ModalOverlay />
        <ModalContent mx={4} my={{ base: 4, md: 12 }}>
          <ModalHeader pr={12} pb={2}>
            Redmine by task prefix
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Box mb={3}>
              {storageKey && !storageFailed && (
                <Badge
                  colorScheme="teal"
                  textTransform="none"
                  fontWeight={500}
                  px={2}
                  py={1}
                  borderRadius="md"
                >
                  Saved in this browser ·{" "}
                  {currentSettings?.presetName || "Current profile"}
                </Badge>
              )}
            </Box>
            <Text fontSize="sm" color="gray.600" mb={4}>
              Prefixes come from codes at the start of your cards: CE-608 and
              CE-609 both use CE. The list updates when you import, add or edit
              logs. Choose a Redmine task, then click Apply mappings to update
              matching cards.
            </Text>

            {prefixes.length > 0 ? (
              <Box borderWidth="1px" borderColor="gray.200" borderRadius="md">
                <Grid
                  templateColumns={columns}
                  gap={3}
                  px={3}
                  py={2}
                  bg="gray.50"
                  borderTopRadius="md"
                  fontSize="xs"
                  fontWeight={700}
                  color="gray.600"
                >
                  <Text>Prefix</Text>
                  <Text>Redmine task</Text>
                  <Text
                    display={{ base: "none", md: "block" }}
                    textAlign="right"
                  >
                    Cards
                  </Text>
                </Grid>
                {prefixes.map((prefix) => {
                  const count = counts.get(prefix) || 0;
                  const selected = options.find(
                    (option) => option.value === mappings[prefix]
                  );
                  const unavailable = mappings[prefix] != null && !selected;
                  return (
                    <Grid
                      key={prefix}
                      templateColumns={columns}
                      gap={3}
                      p={3}
                      alignItems="center"
                      borderTopWidth="1px"
                      borderColor="gray.100"
                    >
                      <Box>
                        <Badge
                          colorScheme="blue"
                          fontSize="sm"
                          px={2}
                          py={1}
                          borderRadius="md"
                        >
                          {prefix}
                        </Badge>
                        <Text
                          display={{ base: "block", md: "none" }}
                          fontSize="xs"
                          color="gray.500"
                          mt={1}
                        >
                          {count} cards
                        </Text>
                      </Box>
                      <Box minW={0}>
                        <Select
                          aria-label={`Redmine task for ${prefix}`}
                          inputId={`redmine-prefix-${prefix}`}
                          value={
                            selected ||
                            (unavailable
                              ? {
                                  value: mappings[prefix],
                                  label: `Unavailable task #${mappings[prefix]}`,
                                }
                              : null)
                          }
                          onChange={(option) =>
                            setMapping(prefix, option?.value ?? null)
                          }
                          options={options}
                          isClearable
                          placeholder="Choose a Redmine task…"
                          noOptionsMessage={() => "No Redmine tasks available"}
                          menuPosition="fixed"
                          menuPlacement="auto"
                          maxMenuHeight={200}
                          styles={{
                            control: (base) => ({
                              ...base,
                              fontSize: "14px",
                              borderColor: unavailable
                                ? "#E53E3E"
                                : base.borderColor,
                            }),
                            menu: (base) => ({ ...base, fontSize: "14px" }),
                          }}
                        />
                        {unavailable && (
                          <Text fontSize="xs" color="red.600" mt={1}>
                            This saved task is unavailable. Choose another to
                            apply this rule.
                          </Text>
                        )}
                      </Box>
                      <Text
                        display={{ base: "none", md: "block" }}
                        textAlign="right"
                        fontSize="sm"
                        color={count ? "gray.700" : "gray.400"}
                      >
                        {count}
                      </Text>
                    </Grid>
                  );
                })}
              </Box>
            ) : (
              <Box bg="gray.50" borderRadius="md" p={4}>
                <Text fontSize="sm" color="gray.600">
                  Import logs with codes such as CE-608 at the start of the
                  description. Their prefixes will appear here.
                </Text>
              </Box>
            )}

            {prefixes.length > 0 && (
              <Flex gap={1} mt={4} alignItems="center">
                <Checkbox
                  size="sm"
                  isChecked={onlyEmpty}
                  onChange={(event) => setOnlyEmpty(event.target.checked)}
                >
                  Only fill empty Redmine fields
                </Checkbox>
                <Tooltip
                  label="Checked: fills only cards with no Redmine task selected and keeps existing assignments. Unchecked: replaces the Redmine task on all cards with a mapped prefix. Changes happen only after you click Apply mappings."
                  hasArrow
                  placement="top"
                  maxW="320px"
                  px={3}
                  py={2}
                  closeOnClick={false}
                >
                  <IconButton
                    aria-label="About filling empty Redmine fields"
                    icon={<InfoOutlineIcon />}
                    size="xs"
                    variant="ghost"
                    color="gray.500"
                  />
                </Tooltip>
              </Flex>
            )}
            {(!storageKey || storageFailed) && (
              <Text fontSize="xs" color="orange.700" mt={3}>
                {storageFailed
                  ? "Browser storage is unavailable. Rules will only last for this session."
                  : "Connect a Redmine profile to remember these rules in this browser."}
              </Text>
            )}
          </ModalBody>
          <ModalFooter gap={4} justifyContent="space-between" flexWrap="wrap">
            <Box>
              <Text fontSize="sm" fontWeight={600} aria-live="polite">
                {preview.updatedCount} card(s) will change
              </Text>
              <Text fontSize="xs" color="gray.500">
                {onlyEmpty
                  ? "Existing assignments will be kept."
                  : "Replaces existing assignments for mapped prefixes."}
              </Text>
            </Box>
            <Flex gap={2} ml="auto">
              <Button size="sm" variant="ghost" onClick={onClose}>
                Close
              </Button>
              <Button
                size="sm"
                colorScheme="teal"
                onClick={handleApply}
                isDisabled={!preview.updatedCount}
              >
                Apply mappings
              </Button>
            </Flex>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default RedminePrefixMappings;
