"use client";

import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";

export interface TabItem {
  icon: React.ReactNode;
  label: string;
  color: string;
  id: string; // Internal identifier for mapping
}

export interface AnimatedTabBarProps {
  items: TabItem[];
  activeIndex?: number;
  onTabChange?: (index: number) => void;
}

export const AnimatedTabBar: React.FC<AnimatedTabBarProps> = ({
  items,
  activeIndex: controlledIndex,
  onTabChange,
}) => {
  const [internalIndex, setInternalIndex] = useState(controlledIndex !== undefined ? controlledIndex : 0);
  const activeIndex = controlledIndex !== undefined ? controlledIndex : internalIndex;

  const menuRef = useRef<HTMLMenuElement>(null);
  const menuBorderRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const offsetMenuBorder = useCallback(() => {
    const activeItem = itemRefs.current[activeIndex];
    const menu = menuRef.current;
    const menuBorder = menuBorderRef.current;

    if (activeItem && menu && menuBorder) {
      const left = Math.floor(
        activeItem.offsetLeft - (menuBorder.offsetWidth - activeItem.offsetWidth) / 2
      );
      menuBorder.style.transform = `translate3d(${left}px, 0, 0)`;
    }
  }, [activeIndex]);

  useEffect(() => {
    offsetMenuBorder();
    const handleResize = () => {
      if (menuRef.current) {
        menuRef.current.style.setProperty("--timeOut", "none");
      }
      offsetMenuBorder();
    };

    window.addEventListener("resize", handleResize);
    // Timeout to ensure initial layout completes and positions correctly
    const timeout = setTimeout(offsetMenuBorder, 100);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeout);
    };
  }, [offsetMenuBorder, items.length]);

  const handleItemClick = (index: number) => {
    if (menuRef.current) {
      menuRef.current.style.removeProperty("--timeOut");
    }
    if (activeIndex === index) return;
    setInternalIndex(index);
    if (onTabChange) {
      onTabChange(index);
    }
  };

  return (
    <>
      <div className="svg-container">
        <svg viewBox="0 0 202.9 45.5">
          <clipPath
            id="menu-clip-path"
            clipPathUnits="objectBoundingBox"
            transform="scale(0.0049285362247413 0.021978021978022)"
          >
            <path d="M6.7,45.5c5.7,0.1,14.1-0.4,23.3-4c5.7-2.3,9.9-5,18.1-10.5c10.7-7.1,11.8-9.2,20.6-14.3c5-2.9,9.2-5.2,15.2-7 c7.1-2.1,13.3-2.3,17.6-2.1c4.2-0.2,10.5,0.1,17.6,2.1c6.1,1.8,10.2,4.1,15.2,7c8.8,5,9.9,7.1,20.6,14.3c8.3,5.5,12.4,8.2,18.1,10.5 c9.2,3.6,17.6,4.2,23.3,4H6.7z" />
          </clipPath>
        </svg>
      </div>

      <menu className="menu" ref={menuRef}>
        {items.map((item, index) => (
          <button
            key={item.id}
            ref={(el) => { itemRefs.current[index] = el; }}
            className={`menu__item ${activeIndex === index ? "active" : ""}`}
            style={{ "--bgColorItem": item.color } as React.CSSProperties}
            onClick={() => handleItemClick(index)}
            aria-label={item.label}
          >
            <div className="menu__item-icon-wrapper">
              {item.icon}
            </div>
            <span className="menu__item-label">{item.label}</span>
          </button>
        ))}
        <div className="menu__border" ref={menuBorderRef}></div>
      </menu>
    </>
  );
};
