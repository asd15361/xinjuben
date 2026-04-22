export function AppBackdrop(): JSX.Element {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div
        className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,122,0,0.06) 0%, transparent 70%)',
          filter: 'blur(60px)'
        }}
      />
      <div
        className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)',
          filter: 'blur(60px)'
        }}
      />
    </div>
  )
}
