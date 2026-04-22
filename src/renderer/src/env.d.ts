/// <reference types="vite/client" />

declare module '*.svg' {
  import type React from 'react'
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>
  const src: string
  export default src
}

// JSX namespace declaration for React 19
declare namespace JSX {
  interface Element extends React.JSX.Element {}
  interface IntrinsicElements extends React.JSX.IntrinsicElements {}
}
