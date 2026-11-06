import { Component } from "react";
import { Alert, AlertIcon, Button, Flex, Text } from "@chakra-ui/react";

import useWorkLogsStore from "../../store/worklogsStore";

// Keeps a card that cannot be rendered (say, a damaged saved snapshot) from
// taking the whole page down. The rest of the page keeps working.
class CardsErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("Cards could not be displayed:", error);
  }

  handleClear = () => {
    // The store subscription removes the saved key.
    useWorkLogsStore.getState().resetWorkLogs();
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <Alert status="error" borderRadius="0" alignItems="center" gap={3}>
        <AlertIcon />
        <Flex flex={1} align="center" justify="space-between" gap={3} wrap="wrap">
          <Text fontSize="md">Your saved cards could not be displayed.</Text>
          <Button size="sm" colorScheme="red" borderRadius="0" onClick={this.handleClear}>
            Clear saved cards
          </Button>
        </Flex>
      </Alert>
    );
  }
}

export default CardsErrorBoundary;
