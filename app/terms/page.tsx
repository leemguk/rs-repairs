import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Shield } from "lucide-react"
import Link from "next/link"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-semibold">Back to Home</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <img 
              src="https://ih5f1pkyy3brtmob.public.blob.vercel-storage.com/RepairHelpLogo.png" 
              alt="Repair Help" 
              className="h-8 w-auto"
            />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="mb-8 text-center">
              <Shield className="mx-auto h-12 w-12 text-orange-600 mb-4" />
              <h1 className="text-3xl font-bold mb-2">Terms and Conditions</h1>
              <p className="text-gray-600">Last updated: 19th July 2025</p>
            </div>

            <div className="prose prose-gray max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
                <p className="mb-4">
                  These Terms and Conditions ("Terms") govern your use of the repair.help website and services 
                  (the "Service") operated by Ransom Spares Ltd ("we", "us", or "our"), a company registered 
                  in England and Wales with its registered office at Unit 3 Flushing Meadow, Yeovil, BA21 5DL.
                </p>
                <p className="mb-4">
                  By accessing or using our Service, you agree to be bound by these Terms. If you disagree 
                  with any part of these terms, you may not access the Service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">2. Service Description</h2>
                <p className="mb-4">
                  repair.help operates as a booking platform that connects customers with professional appliance 
                  repair services. We partner with Pacifica Group Ltd ("Pacifica"), who fulfill all repair 
                  services booked through our platform.
                </p>
                <p className="mb-4">Our services include:</p>
                <ul className="list-disc pl-6 mb-4">
                  <li>Online booking system for appliance repairs</li>
                  <li>AI-powered diagnostic tool (DiagnoSys)</li>
                  <li>Spare parts search functionality</li>
                  <li>Warranty protection plans</li>
                  <li>Embeddable booking widget for third-party websites</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">3. Repair Service Provider</h2>
                <p className="mb-4">
                  <strong>Important Notice:</strong> All repair services booked through repair.help are 
                  performed by Pacifica Group Ltd, registered in England and Wales under company number 
                  05288361, with its registered office at The Venter Building, 3 Mandarin Way, Rainton 
                  Business Park, Houghton Le Spring, Tyne and Wear DH4 5RA.
                </p>
                <p className="mb-4">
                  By booking a repair through our Service, you acknowledge and accept that:
                </p>
                <ul className="list-disc pl-6 mb-4">
                  <li>Pacifica will be the party performing the repair services</li>
                  <li>Pacifica's terms and conditions also apply to the repair services</li>
                  <li>repair.help acts as an intermediary facilitating the booking</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">4. Booking and Pricing</h2>
                <h3 className="text-xl font-semibold mb-3">4.1 Service Options and Pricing</h3>
                <p className="mb-4">Our standard service charges include:</p>
                <ul className="list-disc pl-6 mb-4">
                  <li>Same-day service: From £159 (bookings made before midday)</li>
                  <li>Next-day service: From £149</li>
                  <li>Standard service (2-3 working days): From £139</li>
                </ul>
                <p className="mb-4">
                  Prices may vary based on appliance type and brand. All prices include VAT where applicable.
                </p>

                <h3 className="text-xl font-semibold mb-3">4.2 What's Included</h3>
                <p className="mb-4">The service charge includes:</p>
                <ul className="list-disc pl-6 mb-4">
                  <li>Engineer call-out</li>
                  <li>Diagnosis of the fault</li>
                  <li>Labour for the repair</li>
                  <li>Parts required for the repair (subject to exclusions)</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3">4.3 Payment</h3>
                <p className="mb-4">
                  Payment is processed securely through Stripe at the time of booking. We accept all major 
                  credit and debit cards. By providing payment information, you authorise us to charge the 
                  specified amount for the service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">5. Service Exclusions</h2>
                <p className="mb-4">The fixed repair price does NOT include the following parts:</p>
                <ul className="list-disc pl-6 mb-4">
                  <li>Tubs, Drums and Bearings</li>
                  <li>Compressors / Regas</li>
                  <li>Hob Glass</li>
                  <li>Induction units</li>
                </ul>
                <p className="mb-4">Additional exclusions:</p>
                <ul className="list-disc pl-6 mb-4">
                  <li>This service is for domestic appliances only (not commercial or industrial)</li>
                  <li>If two engineers are required due to accessibility issues, an additional charge of £89.99 applies</li>
                  <li>We are not responsible for repositioning appliances after repair</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">6. Service Delivery</h2>
                <p className="mb-4">
                  Pacifica aims to schedule appointments within the timeframe selected at booking. However, 
                  during busy periods, engineer availability issues, or in some rural locations, these targets 
                  may not always be achievable.
                </p>
                <p className="mb-4">
                  If parts are not available on the initial visit, the engineer will order them and arrange 
                  a follow-up appointment. If the repair cannot continue due to part unavailability, a refund 
                  will be made of the service charge paid less £89.99.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">7. Repair Guarantee</h2>
                <p className="mb-4">
                  All repairs carried out by Pacifica are covered by a 60-day parts and labour guarantee. 
                  This covers any faults related to the original repair. New, unrelated faults are not covered 
                  and will incur a new service charge.
                </p>
                <p className="mb-4">
                  This guarantee does not affect your statutory rights under the Consumer Rights Act 2015 
                  or any other applicable laws.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">8. User Responsibilities</h2>
                <p className="mb-4">When using our Service, you agree to:</p>
                <ul className="list-disc pl-6 mb-4">
                  <li>Provide accurate and complete information about your appliance and the fault</li>
                  <li>Ensure safe access to the appliance for the engineer</li>
                  <li>Be present (or have an authorised adult present) during the repair visit</li>
                  <li>Make the appliance accessible for repair</li>
                  <li>Inform us of any health and safety risks at the property</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">9. Cancellation and Refunds</h2>
                <p className="mb-4">
                  You may cancel your booking up to 24 hours before the scheduled appointment for a full 
                  refund. Cancellations made less than 24 hours before the appointment may incur a 
                  cancellation fee.
                </p>
                <p className="mb-4">
                  If we or Pacifica need to cancel your appointment, you will receive a full refund.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">10. Limitation of Liability</h2>
                <p className="mb-4">
                  To the maximum extent permitted by law, repair.help shall not be liable for any indirect, 
                  incidental, special, consequential, or punitive damages resulting from your use of the Service.
                </p>
                <p className="mb-4">
                  Our total liability to you for any claim arising out of or relating to these Terms or the 
                  Service shall not exceed the amount paid by you for the specific service giving rise to the claim.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">11. Widget Usage Terms</h2>
                <p className="mb-4">
                  If you embed our booking widget on your website:
                </p>
                <ul className="list-disc pl-6 mb-4">
                  <li>You must not modify or alter the widget code</li>
                  <li>You must not misrepresent your relationship with repair.help</li>
                  <li>You are responsible for your website's compliance with applicable laws</li>
                  <li>We may suspend widget access if these terms are violated</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">12. Intellectual Property</h2>
                <p className="mb-4">
                  The Service and its original content, features, and functionality are owned by Ransom 
                  Spares Ltd and are protected by international copyright, trademark, patent, trade secret, 
                  and other intellectual property laws.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">13. Changes to Terms</h2>
                <p className="mb-4">
                  We reserve the right to modify these Terms at any time. Changes will not affect services 
                  that were agreed upon prior to the amended Terms being posted. Your continued use of the 
                  Service after changes constitutes acceptance of the new Terms.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">14. Governing Law</h2>
                <p className="mb-4">
                  These Terms are governed by and construed in accordance with the laws of England and Wales. 
                  You agree to submit to the exclusive jurisdiction of the courts of England and Wales.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">15. Contact Information</h2>
                <p className="mb-4">
                  If you have any questions about these Terms, please contact us at:
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-semibold">Ransom Spares Ltd</p>
                  <p>Unit 3 Flushing Meadow</p>
                  <p>Yeovil, BA21 5DL</p>
                  <p>Email: support@repair.help</p>
                  <p>Phone: 0303 003 6404</p>
                </div>
              </section>
            </div>

            <div className="mt-8 pt-8 border-t text-center">
              <Link href="/">
                <Button className="bg-orange-600 hover:bg-orange-700">
                  Return to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}