import { Component, ReactNode, ErrorInfo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            {this.state.error?.message || "An unexpected error occurred."}
          </Text>
          <Pressable style={styles.button} onPress={this.handleReload}>
            <Text style={styles.buttonText}>Reload App</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b1220",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 24,
    color: "#ffffff",
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#0f766e",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
