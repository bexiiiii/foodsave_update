import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "",
  description: "",
  // other metadata
};

export default function SignUp() {
  return <SignUpForm />;
}
