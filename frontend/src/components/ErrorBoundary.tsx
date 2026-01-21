import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    // Reload the page to clear any module loading issues
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || 'Unknown error occurred';
      const isModuleError = errorMessage.includes('Failed to fetch') || 
                           errorMessage.includes('dynamically imported module') ||
                           errorMessage.includes('ERR_CONTENT_LENGTH_MISMATCH') ||
                           errorMessage.includes('Outdated Optimize Dep');

      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-destructive" />
                <CardTitle>Erro ao carregar página</CardTitle>
              </div>
              <CardDescription>
                Ocorreu um erro ao tentar carregar esta página.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isModuleError ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Erro ao carregar módulo. Isso geralmente acontece quando há problemas com o cache do Vite.
                  </p>
                  <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                    {errorMessage}
                  </p>
                  <div className="flex flex-col gap-2 pt-2">
                    <Button onClick={this.handleReset} className="w-full">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Recarregar página
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Se o problema persistir, tente limpar o cache do navegador (Ctrl+Shift+R)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded break-all">
                    {errorMessage}
                  </p>
                  {this.state.errorInfo && (
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer mb-2">Detalhes técnicos</summary>
                      <pre className="bg-muted p-2 rounded overflow-auto max-h-40">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                  <Button onClick={this.handleReset} className="w-full mt-4">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Tentar novamente
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
