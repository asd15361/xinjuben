import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    errorStr: string;
}

/**
 * 基础层 - 异常兜底保护壳
 */
export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        errorStr: ''
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, errorStr: error.message };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // 基础层异常捕获拦截：写入日志
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex w-full h-screen items-center justify-center bg-black text-orange-500">
                    <div className="glass-panel p-8 rounded-lg max-w-lg text-center">
                        <h1 className="text-2xl font-bold mb-4">核心系统兜底拦截</h1>
                        <p className="text-sm text-gray-400 mb-6">
                            发生了预期外的模块崩溃。为了防止单点故障扩散全系统，当前页面已进入本地降级模式。
                        </p>
                        <pre className="bg-red-900/20 text-red-400 text-xs p-4 rounded text-left overflow-auto mb-6">
                            {this.state.errorStr}
                        </pre>
                        <button
                            className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-full transition-all"
                            onClick={() => this.setState({ hasError: false })}
                        >
                            解除隔离并重试
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
