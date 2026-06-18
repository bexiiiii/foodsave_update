import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Войти | FoodSave Admin",
  description: "Войдите в панель управления FoodSave Admin",
};

export default function SignIn() {
  return <SignInForm />;
}
