import { Disclosure } from "@headlessui/react";
import {
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { NavLink } from "react-router-dom";

import { RiLoginCircleLine } from "react-icons/ri";
import { FaRegUser } from "react-icons/fa";

export default function PublicNavbar() {

  // Mobile menu link styling
  const mobileLinkClasses = ({ isActive }) =>
    `block rounded-md border-l-4 py-2 pl-3 pr-4
     text-base font-medium transition-all duration-200
     sm:pl-5 sm:pr-6
     ${
       isActive
         ? "border-indigo-600 bg-indigo-50 text-indigo-700"
         : "border-transparent text-gray-500 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
     }`;

  // Desktop Expense Tracker / About active link styling
  const desktopLinkClasses = ({ isActive }) =>
    `inline-flex items-center rounded-md px-3 py-2
     text-sm font-medium transition-all duration-200
     ${
       isActive
         ? "border-b-2 border-indigo-600 bg-indigo-50 text-indigo-700"
         : "border-b-2 border-transparent text-gray-900 hover:bg-indigo-50 hover:text-indigo-600"
     }`;

  return (
    <Disclosure as="nav" className="bg-white shadow">
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

            <div className="flex h-16 justify-between">

              {/* LEFT SECTION */}
              <div className="flex">

                {/* Mobile Hamburger Menu */}
                <div className="-ml-2 mr-2 flex items-center md:hidden">

                  <Disclosure.Button
                    className="
                      relative inline-flex items-center justify-center
                      rounded-md p-2 text-gray-400
                      hover:bg-gray-100 hover:text-gray-500
                      focus:outline-none focus:ring-2
                      focus:ring-inset focus:ring-indigo-500
                    "
                  >
                    <span className="absolute -inset-0.5" />

                    <span className="sr-only">
                      Open main menu
                    </span>

                    {open ? (
                      <XMarkIcon className="block h-6 w-6" />
                    ) : (
                      <Bars3Icon className="block h-6 w-6" />
                    )}
                  </Disclosure.Button>

                </div>

                {/* Logo */}
                <div className="flex flex-shrink-0 items-center">

                  <img
                    src="/icons/icon-master-1024.png"
                    alt="Expense Tracker Logo"
                    className="h-10 w-10 rounded-full object-contain"
                  />

                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:ml-6 md:flex md:items-center md:gap-1">

                  {/* Expense Tracker */}
                  <NavLink
                    to="/"
                    end
                    className={desktopLinkClasses}
                  >
                    Expense Tracker
                  </NavLink>

                  {/* About */}
                  <NavLink
                    to="/about"
                    className={desktopLinkClasses}
                  >
                    About
                  </NavLink>

                </div>

              </div>

              {/* RIGHT SECTION */}

              <div className="flex items-center">

                <div className="flex-shrink-0">

                  {/* REGISTER BUTTON */}
                  <NavLink
                    to="/register"
                    className="relative inline-flex items-center gap-x-1.5
                    rounded-md bg-pink-600 px-3 py-2 text-sm
                    font-semibold text-white shadow-sm
                    hover:bg-orange-600 focus-visible:outline
                    focus-visible:outline-2 focus-visible:outline-offset-2
                    focus-visible:outline-indigo-600"
                  >
                    <FaRegUser
                      className="-ml-0.5 h-5 w-5"
                      aria-hidden="true"
                    />
                    Register
                  </NavLink>

                  {/* LOGIN BUTTON */}
                  <NavLink
                    to="/login"
                    className={({ isActive }) =>
                      `relative ml-2 inline-flex items-center gap-x-1.5
                      rounded-md bg-green-600 px-3 py-2 text-sm
                      font-semibold text-white shadow-sm
                      hover:bg-orange-600 focus-visible:outline
                      focus-visible:outline-2 focus-visible:outline-offset-2
                      focus-visible:outline-indigo-600
                      ${!isActive ? "animate-bounce" : ""}`
                    }
                  >
                    <RiLoginCircleLine
                      className="-ml-0.5 h-5 w-5"
                      aria-hidden="true"
                    />
                    Login
                  </NavLink>

                </div>

                <div className="hidden md:ml-4 md:flex md:flex-shrink-0 md:items-center">

                  <button
                    type="button"
                    className="relative rounded-full bg-white p-1
                    text-gray-400 hover:text-gray-500
                    focus:outline-none focus:ring-2
                    focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    <span className="absolute -inset-1.5" />
                  </button>

                </div>

              </div>

            </div>

          </div>

          {/* MOBILE MENU */}

          <Disclosure.Panel className="border-t border-gray-100 md:hidden">

            <div className="space-y-1 bg-white px-3 pb-3 pt-3">

              {/* Expense Tracker */}
              <NavLink
                to="/"
                end
                className={mobileLinkClasses}
              >
                Expense Tracker
              </NavLink>

              {/* About */}
              <NavLink
                to="/about"
                className={mobileLinkClasses}
              >
                About
              </NavLink>

              {/* Register */}
              <NavLink
                to="/register"
                className={mobileLinkClasses}
              >
                <span className="flex items-center gap-2">
                  <FaRegUser className="h-4 w-4" />
                  Register
                </span>
              </NavLink>

              {/* Login */}
              <NavLink
                to="/login"
                className={mobileLinkClasses}
              >
                <span className="flex items-center gap-2">
                  <RiLoginCircleLine className="h-5 w-5" />
                  Login
                </span>
              </NavLink>

            </div>

          </Disclosure.Panel>

        </>
      )}
    </Disclosure>
  );
}
