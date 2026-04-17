import { Component, ErrorInfo, ReactNode } from 'react'
import {
  deriveDynamicImportErrorState,
  reloadCurrentRendererResources
} from '../app/utils/dynamic-import-recovery'

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
  errorStr: string
  importMismatch: boolean
}

/**
 * 基础层 - 异常兜底保护壳
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorStr: '',
    importMismatch: false
  }

  public static getDerivedStateFromError(error: Error): State {
    const errorState = deriveDynamicImportErrorState(error)
    return { hasError: true, ...errorState }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex w-full h-screen items-center justify-center bg-black text-orange-500">
          <div className="glass-panel p-8 rounded-lg max-w-lg text-center">
            <h1 className="text-2xl font-bold mb-4">核心系统兜底拦截</h1>
            <p className="text-sm text-gray-400 mb-6">
              {this.state.importMismatch
                ? '检测到 renderer 资源版本错位，系统只允许整页重新载入当前有效资源，不再做本地假重试。'
                : '发生了预期外的模块崩溃。为了防止单点故障扩散全系统，当前页面已进入本地降级模式。'}
            </p>
            <pre className="bg-red-900/20 text-red-400 text-xs p-4 rounded text-left overflow-auto mb-6">
              {this.state.errorStr}
            </pre>
            <button
              className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-full transition-all"
              onClick={() => {
                if (this.state.importMismatch) {
                  reloadCurrentRendererResources()
                  return
                }
                if (!this.state.importMismatch) {
                  this.setState({ hasError: false, errorStr: '', importMismatch: false })
                }
              }}
            >
              {this.state.importMismatch ? '刷新当前页面' : '关闭兜底并返回页面'}
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
