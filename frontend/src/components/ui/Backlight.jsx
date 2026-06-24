import { useId } from "react";

export function Backlight({
  blur = 20,
  children,
  className,
}) {
  const id = useId();

  return (
    <div className={className}>
      <svg width="0" height="0" aria-hidden="true">
<filter
  id={id}
  x="-100%"
  y="-100%"
  width="300%"
  height="300%"
>
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation={blur}
            result="blurred"
          />
          <feColorMatrix
            type="saturate"
            in="blurred"
            values="4"
          />
          <feComposite
            in="SourceGraphic"
            operator="over"
          />
        </filter>
      </svg>

      <div style={{ filter: `url(#${id})` }}>
        {children}
      </div>
    </div>
  );
}