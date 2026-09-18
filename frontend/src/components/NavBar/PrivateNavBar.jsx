import { useQueryClient } from "@tanstack/react-query";
import { Fragment } from "react";
import { Disclosure, Menu, Transition } from "@headlessui/react";
import {
  Bars3Icon,
  BellIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  Link,
  NavLink,
  useNavigate,
} from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { IoLogOutOutline } from "react-icons/io5";
import { SiAuthy } from "react-icons/si";
import { logoutAction } from "../../redux/slice/authSlice";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

// Desktop navigation styling
const navLinkClasses = ({ isActive }) =>
  classNames(
    "inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium",
    "transition-all duration-300 ease-in-out",
    "hover:-translate-y-0.5",
    isActive
      ? "border-indigo-600 bg-indigo-50 px-2 text-indigo-700 shadow-sm"
      : "border-transparent text-gray-500 hover:border-indigo-400 hover:bg-gray-50 hover:text-indigo-700"
  );

// Mobile navigation styling
const mobileLinkClasses = ({ isActive }) =>
  classNames(
    "block border-l-4 py-2 pl-3 pr-4 text-base font-medium",
    "transition-all duration-300 ease-in-out",
    "hover:translate-x-1",
    isActive
      ? "border-indigo-600 bg-indigo-100 font-semibold text-indigo-700 shadow-sm"
      : "border-transparent text-gray-500 hover:border-indigo-400 hover:bg-gray-50 hover:text-indigo-700"
  );

export default function PrivateNavbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const user = useSelector((state) => state.auth.user);

  if (!user) return null;

  const logoutHandler = () => {
    dispatch(logoutAction());
    queryClient.clear();
    navigate("/login");
  };

  return (
    <Disclosure
      as="nav"
      className="bg-white shadow-sm"
      defaultOpen={true}
    >
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-start">
              <div className="flex w-full flex-row justify-center">
                {/* Mobile menu button */}
                <div className="-ml-2 mr-2 flex items-left md:hidden">
                  <Disclosure.Button
                    className={classNames(
                      "relative inline-flex items-center justify-center rounded-md p-2",
                      "text-gray-400 transition-all duration-300",
                      "hover:bg-indigo-50 hover:text-indigo-600",
                      "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500",
                      open ? "rotate-0" : "rotate-0"
                    )}
                  >
                    <span className="absolute -inset-0.5" />
                    <span className="sr-only">
                      {open ? "Close main menu" : "Open main menu"}
                    </span>

                    {open ? (
                      <XMarkIcon
                        className="block h-6 w-6 transition-transform duration-300"
                        aria-hidden="true"
                      />
                    ) : (
                      <Bars3Icon
                        className="block h-6 w-6 transition-transform duration-300"
                        aria-hidden="true"
                      />
                    )}
                  </Disclosure.Button>
                </div>

                {/* Logo */}
                <div className="flex flex-shrink-0 items-center transition-transform duration-300 hover:scale-105">
                  <SiAuthy className="h-8 w-auto text-green-500" />
                </div>

                {/* Expense Tracker link */}
                <div className="hidden md:ml-6 md:flex md:space-x-8">
                  <NavLink
                    to="/"
                    end
                    className={navLinkClasses}
                  >
                    Expense Tracker
                  </NavLink>
                </div>

                {/* Desktop navigation links */}
                <div className="hidden md:ml-6 md:flex md:space-x-8">
                  <NavLink
                    to="/add-transaction"
                    className={navLinkClasses}
                  >
                    Add Transaction
                  </NavLink>

                  <NavLink
                    to="/add-category"
                    className={navLinkClasses}
                  >
                    Add Category
                  </NavLink>

                  <NavLink
                    to="/categories"
                    className={navLinkClasses}
                  >
                    Categories
                  </NavLink>

                  <NavLink
                    to="/profile"
                    className={navLinkClasses}
                  >
                    Profile
                  </NavLink>

                  <NavLink
                    to="/dashboard"
                    className={navLinkClasses}
                  >
                    Dashboard
                  </NavLink>
                </div>
              </div>

              {/* Right-side actions */}
              <div className="flex items-center">
                {/* Logout button */}
                <div className="flex-shrink-0">
                  <button
                    onClick={logoutHandler}
                    type="button"
                    className={classNames(
                      "relative m-2 inline-flex items-center gap-x-1.5 rounded-md",
                      "bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm",
                      "transition-all duration-300 ease-in-out",
                      "hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-md",
                      "focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
                    )}
                  >
                    <IoLogOutOutline
                      className="h-5 w-5"
                      aria-hidden="true"
                    />
                    <span>Logout</span>
                  </button>
                </div>

                {/* Notification dropdown */}
                <div className="hidden md:ml-1 md:flex md:flex-shrink-0 md:items-center">
                  <Menu as="div" className="relative ml-1">
                    <div>
                      <Menu.Button
                        className={classNames(
                          "relative flex rounded-full bg-white text-sm",
                          "transition-all duration-300 hover:scale-110",
                          "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        )}
                      >
                        <span className="absolute -inset-1.5" />
                        <BellIcon className="h-6 w-6 text-gray-500" />
                        <span className="sr-only">
                          Open user menu
                        </span>
                      </Menu.Button>
                    </div>

                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-200"
                      enterFrom="transform opacity-0 scale-95 -translate-y-2"
                      enterTo="transform opacity-100 scale-100 translate-y-0"
                      leave="transition ease-in duration-150"
                      leaveFrom="transform opacity-100 scale-100 translate-y-0"
                      leaveTo="transform opacity-0 scale-95 -translate-y-2"
                    >
                      <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        {/* Dashboard route */}
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to="/dashboard"
                              className={classNames(
                                active
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "text-gray-700",
                                "block px-4 py-2 text-sm transition-colors duration-200"
                              )}
                            >
                              My Dashboard
                            </Link>
                          )}
                        </Menu.Item>

                        {/* Sign out */}
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={logoutHandler}
                              className={classNames(
                                active
                                  ? "bg-red-50 text-red-700"
                                  : "text-gray-700",
                                "block w-full px-4 py-2 text-left text-sm transition-colors duration-200"
                              )}
                            >
                              Sign out
                            </button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile menu - open by default */}
          <Disclosure.Panel
            className="border-t border-gray-100 md:hidden"
          >
            <div className="space-y-1 pb-3 pt-2">
              <NavLink
                to="/"
                end
                className={mobileLinkClasses}
              >
                Expense Tracker
              </NavLink>

              <NavLink
                to="/add-transaction"
                className={mobileLinkClasses}
              >
                Add Transaction
              </NavLink>

              <NavLink
                to="/add-category"
                className={mobileLinkClasses}
              >
                Add Category
              </NavLink>

              <NavLink
                to="/categories"
                className={mobileLinkClasses}
              >
                Categories
              </NavLink>

              <NavLink
                to="/profile"
                className={mobileLinkClasses}
              >
                Profile
              </NavLink>

              <NavLink
                to="/dashboard"
                className={mobileLinkClasses}
              >
                My Dashboard
              </NavLink>
            </div>

            <div className="border-t border-gray-200 pb-3 pt-4">
              <div className="mt-3 space-y-1">
                <Disclosure.Button
                  as="button"
                  onClick={logoutHandler}
                  className={classNames(
                    "block w-full px-4 py-2 text-left text-base font-medium sm:px-6",
                    "text-gray-500 transition-all duration-300",
                    "hover:bg-red-50 hover:text-red-700"
                  )}
                >
                  Sign out
                </Disclosure.Button>
              </div>
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}
