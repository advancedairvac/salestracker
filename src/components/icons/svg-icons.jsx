/**
 * Usage: <SvgIcon name="search" />
 * Responsive: <SvgIcon name="search" className="h-4 w-4 sm:h-5 sm:w-5" />
 * Logo: <SvgIcon name="logo" className="h-auto w-[120px] sm:w-[150px] lg:w-[180px]" />
 * Add new SVG icons inside the `icons` object.
 */

const icons = {
  logo: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
      <title>Logo</title>
      <g id="Layer_2" data-name="Layer 2">
        <g id="Sales_Tracker" data-name="Sales Tracker">
          <path d="M100,13.57,172.85,50,100,86.43,27.15,50,100,13.57M0,50l100,50L200,50,100,0Z" />
          <path d="M70.09,42.81H61.67V57.19h8.42l2.8-2.8V45.6ZM69.34,53.1l-.67.67H65.22V46.23h3.45l.67.67Z" />
          <polygon points="108.9 50.78 105.5 42.81 101.17 42.81 101.17 57.19 104.65 57.19 104.65 49.22 108.04 57.19 112.38 57.19 112.38 42.81 108.9 42.81 108.9 50.78" />
          <polygon points="127.58 57.19 137.6 57.19 137.6 53.77 131.12 53.77 131.12 51.7 137.6 51.7 137.6 48.28 131.12 48.28 131.12 46.23 137.6 46.23 137.6 42.81 127.58 42.81 127.58 57.19" />
          <path d="M148.21,42.81h-8.42V57.19h8.42l2.8-2.8V45.6Zm-.75,10.29-.67.67h-3.45V46.23h3.45l.67.67Z" />
          <polygon points="118.78 46.23 121.89 46.23 123.59 47.94 126.02 45.52 123.3 42.81 117.37 42.81 114.57 45.61 114.57 53.58 114.57 54.39 117.36 57.19 123.3 57.19 126.02 54.48 123.59 52.06 121.89 53.77 118.78 53.77 118.11 53.1 118.11 46.9 118.78 46.23" />
          <polygon points="87.8 42.81 82.39 57.19 78.86 57.19 73.45 42.81 77.15 42.81 80.63 52.06 84.1 42.81 87.8 42.81" />
          <path d="M96.22,57.19h3.7L94.51,42.81H91l-5.4,14.38h3.7l.64-1.71h5.67Zm-5-5.14,1.54-4.11,1.55,4.11Z" />
          <path d="M56.69,57.19h3.69L55,42.81H51.44L46,57.19h3.7l.64-1.71H56Zm-5-5.14,1.55-4.11,1.54,4.11Z" />
        </g>
      </g>
    </svg>
  ),

  search: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10.86 10.76">
      <title>Search</title>
      <g id="Layer_2" data-name="Layer 2">
        <g id="Sales_Tracker" data-name="Sales Tracker">
          <path d="M4.57,9.15A4.58,4.58,0,1,1,7.81,7.81,4.58,4.58,0,0,1,4.57,9.15Zm0-8.23A3.66,3.66,0,1,0,8.23,4.57,3.66,3.66,0,0,0,4.57.92Z" />
          <rect
            x="8.55"
            y="6.83"
            width="0.92"
            height="4.24"
            transform="translate(-3.69 9.24) rotate(-46.11)"
          />
        </g>
      </g>
    </svg>
  ),

  hamburger: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12.11 9.03">
      <title>Asset 4</title>
      <g id="Layer_2" data-name="Layer 2">
        <g id="Sales_Tracker" data-name="Sales Tracker">
          <rect y="8.11" width="12.11" height="0.92" />
          <rect width="12.11" height="0.92" />
          <rect y="4.06" width="12.11" height="0.92" />
        </g>
      </g>
    </svg>
  ),

  chevronDown: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 9.53 5.3"
      fill="none"
      stroke="#565656"
    >
      <title>chevronDown</title>
      <g id="Layer_2" data-name="Layer 2">
        <g id="Sales_Tracker" data-name="Sales Tracker">
          <polyline className="cls-1" points="9.27 0.27 4.76 4.76 0.27 0.27" />
        </g>
      </g>
    </svg>
  ),

  chevronRight: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 5.3 9.53"
      fill="none"
      stroke="#565656"
    >
      <title>chevronRight</title>
      <g id="Layer_2" data-name="Layer 2">
        <g id="Sales_Tracker" data-name="Sales Tracker">
          <polyline className="cls-1" points="0.27 0.27 4.76 4.76 0.27 9.27" />
        </g>
      </g>
    </svg>
  ),

  calendar: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 15.42 14.4"
      fill="#565656"
    >
      <title>Calender</title>
      <g id="Layer_2" data-name="Layer 2">
        <g id="Sales_Tracker" data-name="Sales Tracker">
          <path
            d="M15.14,1.47h-2.3V1.29a1.29,1.29,0,1,0-2.57,0v.18H5.15V1.29a1.29,1.29,0,1,0-2.57,0v.18H.28A.29.29,0,0,0,0,1.75V14.12a.29.29,0,0,0,.28.28H15.14a.29.29,0,0,0,.28-.28V1.75A.29.29,0,0,0,15.14,1.47Zm-4.32-.18a.73.73,0,1,1,1.46,0V3.07a.73.73,0,1,1-1.46,0Zm-7.69,0a.73.73,0,1,1,1.46,0V3.07a.73.73,0,0,1-1.46,0ZM.56,2h2v1a1.29,1.29,0,1,0,2.57,0V2h5.12v1a1.29,1.29,0,1,0,2.57,0V2h2V5.36H.56Zm14.3,11.81H.56V5.92h14.3Z"
          />
          <path
            d="M9.57,11.52l1.86.93a.27.27,0,0,0,.12,0,.28.28,0,0,0,.13,0l1.86-.93a.27.27,0,0,0,.15-.25.29.29,0,0,0-.15-.25l-1.86-.93a.28.28,0,0,0-.25,0L9.57,11a.28.28,0,0,0-.16.25A.26.26,0,0,0,9.57,11.52Zm2-.86,1.24.61-1.24.62-1.23-.62Z"
          />
        </g>
      </g>
    </svg>
  ),
  lock: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="#000" viewBox="0 0 36 36">
      <title>lock-solid</title>
      <path
        className="clr-i-solid clr-i-solid-path-1"
        d="M26,15V10.72a8.2,8.2,0,0,0-8-8.36,8.2,8.2,0,0,0-8,8.36V15H7V32a2,2,0,0,0,2,2H27a2,2,0,0,0,2-2V15ZM19,25.23V28H17V25.14a2.4,2.4,0,1,1,2,.09ZM24,15H12V10.72a6.2,6.2,0,0,1,6-6.36,6.2,6.2,0,0,1,6,6.36Z"
      ></path>
      <rect x="0" y="0" width="36" height="36" fillOpacity="0" />
    </svg>
  ),
};

export default function SvgIcon({ name, className = "", title }) {
  const icon = icons[name];

  if (!icon) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`SvgIcon: icon "${name}" was not found.`);
    }

    return null;
  }

  return (
    <span
      className={className}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      role={title ? "img" : undefined}
    >
      {icon}
    </span>
  );
}
