import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

const Presentation = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    // Slide 1: Title
    {
      type: "title",
      content: (
        <div className="flex flex-col items-center justify-center h-full space-y-8">
          <img src={logo} alt="I-Bookin Logo" className="w-48 h-48 object-contain" />
          <h1 className="text-6xl font-bold text-primary">I-Bookin</h1>
          <p className="text-3xl text-muted-foreground">Brickwork Invoice Manager</p>
          <p className="text-xl text-muted-foreground mt-8">Streamlining Construction Site Management</p>
        </div>
      ),
    },
    // Slide 2: Overview
    {
      title: "What is I-Bookin?",
      content: (
        <div className="space-y-6">
          <p className="text-2xl">A comprehensive digital platform for managing brickwork operations across construction sites.</p>
          <div className="grid grid-cols-2 gap-6 mt-12">
            <div className="p-6 bg-card rounded-lg border">
              <h3 className="text-2xl font-semibold mb-4 text-primary">For Administrators</h3>
              <ul className="space-y-3 text-lg">
                <li>✓ Manage multiple sites and developers</li>
                <li>✓ Track plot assignments</li>
                <li>✓ Confirm invoices</li>
                <li>✓ Manage bricklayer teams</li>
              </ul>
            </div>
            <div className="p-6 bg-card rounded-lg border">
              <h3 className="text-2xl font-semibold mb-4 text-primary">For Bricklayers</h3>
              <ul className="space-y-3 text-lg">
                <li>✓ Book completed plots</li>
                <li>✓ Generate invoices automatically</li>
                <li>✓ Divide payments among gang members</li>
                <li>✓ Track lift progress</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    // Slide 3: Key Benefits
    {
      title: "Key Benefits",
      content: (
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="p-6 bg-primary/10 rounded-lg">
              <h3 className="text-2xl font-semibold mb-3 text-primary">🎯 Efficiency</h3>
              <p className="text-lg">Automate invoice generation and reduce paperwork by 90%</p>
            </div>
            <div className="p-6 bg-primary/10 rounded-lg">
              <h3 className="text-2xl font-semibold mb-3 text-primary">📊 Transparency</h3>
              <p className="text-lg">Real-time tracking of all work completed and payments</p>
            </div>
            <div className="p-6 bg-primary/10 rounded-lg">
              <h3 className="text-2xl font-semibold mb-3 text-primary">💰 Accuracy</h3>
              <p className="text-lg">Eliminate calculation errors with automated gang division</p>
            </div>
          </div>
          <div className="space-y-6">
            <div className="p-6 bg-primary/10 rounded-lg">
              <h3 className="text-2xl font-semibold mb-3 text-primary">📱 Mobile First</h3>
              <p className="text-lg">Access from any device, anywhere on the construction site</p>
            </div>
            <div className="p-6 bg-primary/10 rounded-lg">
              <h3 className="text-2xl font-semibold mb-3 text-primary">🔒 Security</h3>
              <p className="text-lg">Secure authentication and role-based access control</p>
            </div>
            <div className="p-6 bg-primary/10 rounded-lg">
              <h3 className="text-2xl font-semibold mb-3 text-primary">📧 Automation</h3>
              <p className="text-lg">Automatic email notifications to all stakeholders</p>
            </div>
          </div>
        </div>
      ),
    },
    // Slide 4: Authentication
    {
      title: "Secure Authentication",
      content: (
        <div className="space-y-8">
          <div className="bg-card p-8 rounded-lg border">
            <h3 className="text-2xl font-semibold mb-4 text-primary">User Management</h3>
            <ul className="space-y-4 text-lg">
              <li>✓ Secure email and password authentication</li>
              <li>✓ Password reset functionality</li>
              <li>✓ Role-based access control (Admin vs Bricklayer)</li>
              <li>✓ Session management and auto-logout</li>
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-primary/10 p-6 rounded-lg">
              <h4 className="text-xl font-semibold mb-3">Admin Access</h4>
              <p className="text-lg">Full control over sites, invoices, and user management</p>
            </div>
            <div className="bg-primary/10 p-6 rounded-lg">
              <h4 className="text-xl font-semibold mb-3">Bricklayer Access</h4>
              <p className="text-lg">Focused on booking plots and managing personal invoices</p>
            </div>
          </div>
        </div>
      ),
    },
    // Slide 5: Dashboard Overview
    {
      title: "Dashboard - Central Hub",
      content: (
        <div className="space-y-6">
          <p className="text-xl">The dashboard provides quick access to all key features and important information.</p>
          <div className="grid grid-cols-3 gap-6 mt-8">
            <div className="p-6 bg-card rounded-lg border">
              <h3 className="text-xl font-semibold mb-3 text-primary">Developers</h3>
              <p className="text-lg">View all construction developers and their active sites</p>
            </div>
            <div className="p-6 bg-card rounded-lg border">
              <h3 className="text-xl font-semibold mb-3 text-primary">Sites</h3>
              <p className="text-lg">Access site details, plots, and house types</p>
            </div>
            <div className="p-6 bg-card rounded-lg border">
              <h3 className="text-xl font-semibold mb-3 text-primary">Quick Actions</h3>
              <p className="text-lg">Booking In, Invoice Management, Bricklayer Teams</p>
            </div>
          </div>
          <div className="mt-8 p-6 bg-primary/5 rounded-lg border-2 border-primary/20">
            <h3 className="text-xl font-semibold mb-3 text-primary">Smart Notifications</h3>
            <p className="text-lg">Real-time badges showing unviewed and unconfirmed invoices for admins</p>
          </div>
        </div>
      ),
    },
    // Slide 6: Site Management
    {
      title: "Site Management (Admin)",
      content: (
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-2xl font-semibold mb-4 text-primary">Creating Sites</h3>
            <ul className="space-y-3 text-lg">
              <li>✓ Add site name, location, and description</li>
              <li>✓ Assign to developer</li>
              <li>✓ Define plot count and naming scheme</li>
              <li>✓ Automatic plot generation</li>
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-card p-6 rounded-lg border">
              <h3 className="text-xl font-semibold mb-3 text-primary">House Types</h3>
              <p className="text-lg">Create house type templates with lift rates:</p>
              <ul className="mt-3 space-y-2 text-base">
                <li>• Ground lift rate</li>
                <li>• First lift rate</li>
                <li>• Second lift rate</li>
                <li>• Gable lift rate</li>
              </ul>
            </div>
            <div className="bg-card p-6 rounded-lg border">
              <h3 className="text-xl font-semibold mb-3 text-primary">Plot Assignment</h3>
              <p className="text-lg">Assign house types to specific plots with:</p>
              <ul className="mt-3 space-y-2 text-base">
                <li>• Drag and drop interface</li>
                <li>• Bulk operations</li>
                <li>• Visual plot grid</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    // Slide 7: Drawings Feature
    {
      title: "Drawings Management",
      content: (
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-2xl font-semibold mb-4 text-primary">Upload & Manage Plot Drawings</h3>
            <p className="text-xl mb-4">Attach technical drawings to each plot for easy reference</p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-6 bg-primary/10 rounded-lg">
                <h4 className="text-xl font-semibold mb-3">📤 Upload</h4>
                <p className="text-lg">PDF drawings for each plot with version control</p>
              </div>
              <div className="p-6 bg-primary/10 rounded-lg">
                <h4 className="text-xl font-semibold mb-3">🔍 View</h4>
                <p className="text-lg">Zoom and pan through drawings on any device</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-6 bg-primary/10 rounded-lg">
                <h4 className="text-xl font-semibold mb-3">📥 Export</h4>
                <p className="text-lg">Download drawings as compiled PDF with all plot details</p>
              </div>
              <div className="p-6 bg-primary/10 rounded-lg">
                <h4 className="text-xl font-semibold mb-3">🔗 Link</h4>
                <p className="text-lg">Automatic attachment to invoices for reference</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    // Slide 8: Bricklayer Management
    {
      title: "Bricklayer Team Management",
      content: (
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-2xl font-semibold mb-4 text-primary">Manage Your Team</h3>
            <p className="text-xl">Keep a database of all bricklayers and gang members for quick invoice generation</p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="p-6 bg-primary/10 rounded-lg">
              <h4 className="text-xl font-semibold mb-3">➕ Add Members</h4>
              <p className="text-lg">Name, role, and contact information</p>
            </div>
            <div className="p-6 bg-primary/10 rounded-lg">
              <h4 className="text-xl font-semibold mb-3">🔄 Reuse</h4>
              <p className="text-lg">Quickly add saved members to new invoices</p>
            </div>
            <div className="p-6 bg-primary/10 rounded-lg">
              <h4 className="text-xl font-semibold mb-3">✉️ Email</h4>
              <p className="text-lg">Store email addresses for automatic notifications</p>
            </div>
          </div>
          <div className="mt-6 p-6 bg-card rounded-lg border">
            <h4 className="text-xl font-semibold mb-3 text-primary">Saved Gang Members</h4>
            <p className="text-lg">Build a library of frequent collaborators for instant selection when creating invoices</p>
          </div>
        </div>
      ),
    },
    // Slide 9: Booking Work
    {
      title: "Booking In Work (Bricklayers)",
      content: (
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-2xl font-semibold mb-4 text-primary">Simple 4-Step Process</h3>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-6 bg-primary/10 rounded-lg border-l-4 border-primary">
                <h4 className="text-xl font-semibold mb-2">1️⃣ Select Site</h4>
                <p className="text-lg">Choose from available sites and developers</p>
              </div>
              <div className="p-6 bg-primary/10 rounded-lg border-l-4 border-primary">
                <h4 className="text-xl font-semibold mb-2">2️⃣ Select Plots</h4>
                <p className="text-lg">Pick completed plots with visual grid interface</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-6 bg-primary/10 rounded-lg border-l-4 border-primary">
                <h4 className="text-xl font-semibold mb-2">3️⃣ Select Lifts</h4>
                <p className="text-lg">Mark which lifts were completed (Ground, First, Second, Gable)</p>
              </div>
              <div className="p-6 bg-primary/10 rounded-lg border-l-4 border-primary">
                <h4 className="text-xl font-semibold mb-2">4️⃣ Divide Payment</h4>
                <p className="text-lg">Split payment among gang members automatically</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    // Slide 10: Gang Division
    {
      title: "Gang Division Feature",
      content: (
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-2xl font-semibold mb-4 text-primary">Automatic Payment Distribution</h3>
            <p className="text-xl">Fairly split invoice amounts among all gang members with precision</p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-6 bg-primary/10 rounded-lg">
                <h4 className="text-xl font-semibold mb-3">➕ Add Members</h4>
                <p className="text-lg">Select from saved members or add new ones on the fly</p>
              </div>
              <div className="p-6 bg-primary/10 rounded-lg">
                <h4 className="text-xl font-semibold mb-3">💷 Split Equally</h4>
                <p className="text-lg">One-click equal distribution between selected members</p>
              </div>
              <div className="p-6 bg-primary/10 rounded-lg">
                <h4 className="text-xl font-semibold mb-3">🎚️ Adjust Manually</h4>
                <p className="text-lg">Fine-tune amounts with sliders or direct input</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-6 bg-primary/10 rounded-lg">
                <h4 className="text-xl font-semibold mb-3">👥 Member Types</h4>
                <p className="text-lg">Track roles: Bricklayer, Labourer, Apprentice, etc.</p>
              </div>
              <div className="p-6 bg-primary/10 rounded-lg">
                <h4 className="text-xl font-semibold mb-3">✅ Real-time Validation</h4>
                <p className="text-lg">Visual feedback ensures total matches invoice amount</p>
              </div>
              <div className="p-6 bg-primary/10 rounded-lg">
                <h4 className="text-xl font-semibold mb-3">📧 Email Each Member</h4>
                <p className="text-lg">Automatic notifications with individual payment details</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    // Slide 11: Invoice Generation
    {
      title: "Automatic Invoice Generation",
      content: (
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-2xl font-semibold mb-4 text-primary">Professional PDF Invoices</h3>
            <p className="text-xl">Generated automatically with all details, ready to submit</p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-xl font-semibold text-primary">Invoice Includes:</h4>
              <ul className="space-y-3 text-lg bg-primary/5 p-6 rounded-lg">
                <li>✓ Plot numbers and addresses</li>
                <li>✓ House types and descriptions</li>
                <li>✓ Lift types completed</li>
                <li>✓ Rates per lift</li>
                <li>✓ Total calculations</li>
                <li>✓ Gang member breakdown</li>
                <li>✓ Date and reference number</li>
                <li>✓ Bricklayer contact details</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-xl font-semibold text-primary">Features:</h4>
              <div className="space-y-4">
                <div className="p-4 bg-primary/10 rounded-lg">
                  <h5 className="font-semibold mb-2">📥 Download PDF</h5>
                  <p>High-quality PDF for printing or email</p>
                </div>
                <div className="p-4 bg-primary/10 rounded-lg">
                  <h5 className="font-semibold mb-2">📧 Auto-Email</h5>
                  <p>Sent to admin and all gang members</p>
                </div>
                <div className="p-4 bg-primary/10 rounded-lg">
                  <h5 className="font-semibold mb-2">🎨 Branded</h5>
                  <p>Professional layout with company logo</p>
                </div>
                <div className="p-4 bg-primary/10 rounded-lg">
                  <h5 className="font-semibold mb-2">🔍 Trackable</h5>
                  <p>Unique reference number for each invoice</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    // Slide 12: Invoice Management
    {
      title: "Invoice Management (Admin)",
      content: (
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-2xl font-semibold mb-4 text-primary">Track and Confirm Invoices</h3>
            <p className="text-xl">Comprehensive dashboard for managing all submitted invoices</p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="p-6 bg-primary/10 rounded-lg">
              <h4 className="text-xl font-semibold mb-3">📊 View All</h4>
              <p className="text-lg">See all invoices across all sites in one place</p>
            </div>
            <div className="p-6 bg-primary/10 rounded-lg">
              <h4 className="text-xl font-semibold mb-3">✅ Confirm</h4>
              <p className="text-lg">Mark invoices as confirmed with one click</p>
            </div>
            <div className="p-6 bg-primary/10 rounded-lg">
              <h4 className="text-xl font-semibold mb-3">🔔 Notifications</h4>
              <p className="text-lg">Badge counters for new unviewed invoices</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 mt-4">
            <div className="p-6 bg-card rounded-lg border">
              <h4 className="text-xl font-semibold mb-3 text-primary">Filter & Search</h4>
              <p className="text-lg">Filter by site, date range, confirmation status, or bricklayer</p>
            </div>
            <div className="p-6 bg-card rounded-lg border">
              <h4 className="text-xl font-semibold mb-3 text-primary">Export Reports</h4>
              <p className="text-lg">Generate summary reports for accounting and payroll</p>
            </div>
          </div>
        </div>
      ),
    },
    // Slide 13: Non-Plot Invoices
    {
      title: "Non-Plot Invoice Feature",
      content: (
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-2xl font-semibold mb-4 text-primary">Track Additional Work</h3>
            <p className="text-xl">Invoice for work not tied to specific plots (repairs, extras, general work)</p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-6 bg-primary/10 rounded-lg">
                <h4 className="text-xl font-semibold mb-3">📝 Custom Description</h4>
                <p className="text-lg">Add detailed description of work performed</p>
              </div>
              <div className="p-6 bg-primary/10 rounded-lg">
                <h4 className="text-xl font-semibold mb-3">💷 Set Amount</h4>
                <p className="text-lg">Manually enter agreed-upon amount</p>
              </div>
              <div className="p-6 bg-primary/10 rounded-lg">
                <h4 className="text-xl font-semibold mb-3">👥 Gang Division</h4>
                <p className="text-lg">Same payment splitting functionality</p>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-xl font-semibold text-primary mb-4">Use Cases:</h4>
              <ul className="space-y-3 text-lg bg-card p-6 rounded-lg border">
                <li>✓ Remedial work and repairs</li>
                <li>✓ Site cleanup</li>
                <li>✓ Extra features or modifications</li>
                <li>✓ Emergency work</li>
                <li>✓ General maintenance</li>
                <li>✓ Any non-standard tasks</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    // Slide 14: Mobile Experience
    {
      title: "Mobile-First Design",
      content: (
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-2xl font-semibold mb-4 text-primary">Work from Anywhere</h3>
            <p className="text-xl">Fully responsive design optimized for phones, tablets, and desktops</p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="p-6 bg-primary/10 rounded-lg">
              <h4 className="text-xl font-semibold mb-3">📱 PWA Support</h4>
              <p className="text-lg">Install as an app on any device</p>
            </div>
            <div className="p-6 bg-primary/10 rounded-lg">
              <h4 className="text-xl font-semibold mb-3">⚡ Fast Loading</h4>
              <p className="text-lg">Optimized performance even on slow connections</p>
            </div>
            <div className="p-6 bg-primary/10 rounded-lg">
              <h4 className="text-xl font-semibold mb-3">👆 Touch Optimized</h4>
              <p className="text-lg">Large buttons and swipe gestures</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 mt-4">
            <div className="p-6 bg-card rounded-lg border">
              <h4 className="text-xl font-semibold mb-3 text-primary">On-Site Access</h4>
              <p className="text-lg">Book work directly from the construction site using your phone</p>
            </div>
            <div className="p-6 bg-card rounded-lg border">
              <h4 className="text-xl font-semibold mb-3 text-primary">Offline Ready</h4>
              <p className="text-lg">Continue working even with spotty internet connection</p>
            </div>
          </div>
        </div>
      ),
    },
    // Slide 15: Security & Data
    {
      title: "Security & Data Protection",
      content: (
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-2xl font-semibold mb-4 text-primary">Enterprise-Grade Security</h3>
            <p className="text-xl">Your data is protected with industry-standard security measures</p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-6 bg-primary/10 rounded-lg">
                <h4 className="text-xl font-semibold mb-3">🔐 Encrypted Data</h4>
                <p className="text-lg">All data encrypted in transit and at rest</p>
              </div>
              <div className="p-6 bg-primary/10 rounded-lg">
                <h4 className="text-xl font-semibold mb-3">👤 Role-Based Access</h4>
                <p className="text-lg">Users only see what they're authorized to access</p>
              </div>
              <div className="p-6 bg-primary/10 rounded-lg">
                <h4 className="text-xl font-semibold mb-3">🔄 Regular Backups</h4>
                <p className="text-lg">Automatic backups ensure no data loss</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-6 bg-primary/10 rounded-lg">
                <h4 className="text-xl font-semibold mb-3">📋 Audit Trail</h4>
                <p className="text-lg">Complete history of all actions and changes</p>
              </div>
              <div className="p-6 bg-primary/10 rounded-lg">
                <h4 className="text-xl font-semibold mb-3">🛡️ Secure Authentication</h4>
                <p className="text-lg">Industry-standard password protection</p>
              </div>
              <div className="p-6 bg-primary/10 rounded-lg">
                <h4 className="text-xl font-semibold mb-3">☁️ Cloud Hosted</h4>
                <p className="text-lg">Reliable infrastructure with 99.9% uptime</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    // Slide 16: Workflow Example
    {
      title: "Complete Workflow Example",
      content: (
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-2xl font-semibold mb-4 text-primary">Real-World Scenario</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-lg border-l-4 border-primary">
              <span className="text-2xl font-bold text-primary">1</span>
              <div>
                <h4 className="text-xl font-semibold mb-2">Admin Creates Site</h4>
                <p className="text-lg">Taylor Wimpey development with 50 plots, 5 house types defined</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-lg border-l-4 border-primary">
              <span className="text-2xl font-bold text-primary">2</span>
              <div>
                <h4 className="text-xl font-semibold mb-2">Assign House Types</h4>
                <p className="text-lg">Admin assigns specific house types to plots 1-10, uploads drawings</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-lg border-l-4 border-primary">
              <span className="text-2xl font-bold text-primary">3</span>
              <div>
                <h4 className="text-xl font-semibold mb-2">Bricklayer Books Work</h4>
                <p className="text-lg">John completes plots 1-5, ground and first lifts</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-lg border-l-4 border-primary">
              <span className="text-2xl font-bold text-primary">4</span>
              <div>
                <h4 className="text-xl font-semibold mb-2">Gang Division</h4>
                <p className="text-lg">£5,000 split between John (£3,000) and Tom (£2,000)</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-lg border-l-4 border-primary">
              <span className="text-2xl font-bold text-primary">5</span>
              <div>
                <h4 className="text-xl font-semibold mb-2">Invoice Generated & Sent</h4>
                <p className="text-lg">PDF invoice emailed to admin and both gang members automatically</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-lg border-l-4 border-primary">
              <span className="text-2xl font-bold text-primary">6</span>
              <div>
                <h4 className="text-xl font-semibold mb-2">Admin Confirms</h4>
                <p className="text-lg">Admin reviews invoice, confirms, and processes payment</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    // Slide 17: Key Features Summary
    {
      title: "Key Features at a Glance",
      content: (
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold text-primary mb-4">Core Features</h3>
            <div className="space-y-3 text-lg">
              <div className="p-3 bg-card rounded border">✓ Multi-site management</div>
              <div className="p-3 bg-card rounded border">✓ Plot tracking with house types</div>
              <div className="p-3 bg-card rounded border">✓ Lift-based pricing system</div>
              <div className="p-3 bg-card rounded border">✓ Automatic invoice generation</div>
              <div className="p-3 bg-card rounded border">✓ Gang payment division</div>
              <div className="p-3 bg-card rounded border">✓ PDF drawing management</div>
              <div className="p-3 bg-card rounded border">✓ Email notifications</div>
              <div className="p-3 bg-card rounded border">✓ Mobile responsive design</div>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold text-primary mb-4">Advanced Features</h3>
            <div className="space-y-3 text-lg">
              <div className="p-3 bg-card rounded border">✓ Non-plot invoice tracking</div>
              <div className="p-3 bg-card rounded border">✓ Saved gang member library</div>
              <div className="p-3 bg-card rounded border">✓ Invoice confirmation workflow</div>
              <div className="p-3 bg-card rounded border">✓ Bricklayer team management</div>
              <div className="p-3 bg-card rounded border">✓ Real-time status updates</div>
              <div className="p-3 bg-card rounded border">✓ Export drawings to PDF</div>
              <div className="p-3 bg-card rounded border">✓ Role-based permissions</div>
              <div className="p-3 bg-card rounded border">✓ Secure authentication</div>
            </div>
          </div>
        </div>
      ),
    },
    // Slide 18: Benefits Summary
    {
      title: "Transform Your Operations",
      content: (
        <div className="space-y-8">
          <div className="text-center">
            <h3 className="text-3xl font-bold text-primary mb-4">Why Choose I-Bookin?</h3>
            <p className="text-2xl text-muted-foreground">Digital transformation for the construction industry</p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center p-6 bg-primary/10 rounded-lg">
              <div className="text-5xl font-bold text-primary mb-3">90%</div>
              <p className="text-xl font-semibold mb-2">Less Paperwork</p>
              <p className="text-lg">Eliminate manual forms and calculations</p>
            </div>
            <div className="text-center p-6 bg-primary/10 rounded-lg">
              <div className="text-5xl font-bold text-primary mb-3">100%</div>
              <p className="text-xl font-semibold mb-2">Accuracy</p>
              <p className="text-lg">Automated calculations prevent errors</p>
            </div>
            <div className="text-center p-6 bg-primary/10 rounded-lg">
              <div className="text-5xl font-bold text-primary mb-3">24/7</div>
              <p className="text-xl font-semibold mb-2">Access</p>
              <p className="text-lg">Work from anywhere, anytime</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 mt-8">
            <div className="p-6 bg-card rounded-lg border">
              <h4 className="text-xl font-semibold mb-3 text-primary">Save Time</h4>
              <p className="text-lg">Generate invoices in minutes, not hours</p>
            </div>
            <div className="p-6 bg-card rounded-lg border">
              <h4 className="text-xl font-semibold mb-3 text-primary">Save Money</h4>
              <p className="text-lg">Reduce administrative overhead significantly</p>
            </div>
          </div>
        </div>
      ),
    },
    // Slide 19: Thank You
    {
      type: "title",
      content: (
        <div className="flex flex-col items-center justify-center h-full space-y-8">
          <img src={logo} alt="I-Bookin Logo" className="w-40 h-40 object-contain" />
          <h1 className="text-6xl font-bold text-primary">Thank You</h1>
          <div className="text-center space-y-4">
            <p className="text-3xl text-muted-foreground">I-Bookin - Brickwork Invoice Manager</p>
            <p className="text-2xl mt-8">Ready to transform your construction site management?</p>
          </div>
        </div>
      ),
    },
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  };

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        nextSlide();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevSlide();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .slide-container { 
            page-break-after: always;
            min-height: 100vh;
            padding: 2rem;
          }
          .slide-container:last-child {
            page-break-after: auto;
          }
        }
      `}</style>

      {/* Navigation - Hidden in print */}
      <div className="no-print fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-4 bg-card/95 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className="rounded-full"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <span className="text-sm font-medium min-w-[100px] text-center">
          Slide {currentSlide + 1} / {slides.length}
        </span>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={nextSlide}
          disabled={currentSlide === slides.length - 1}
          className="rounded-full"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>

        <div className="w-px h-6 bg-border mx-2" />

        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrint}
          className="rounded-full"
          title="Print presentation"
        >
          <Printer className="h-5 w-5" />
        </Button>
      </div>

      {/* Slide Content */}
      <div className="slide-container w-full h-screen p-8 md:p-16 flex flex-col">
        {/* Logo in corner - except title slides */}
        {slides[currentSlide].type !== "title" && (
          <div className="flex justify-between items-start mb-8">
            <img src={logo} alt="I-Bookin" className="h-12 w-12 object-contain" />
            <span className="text-sm text-muted-foreground">I-Bookin Presentation</span>
          </div>
        )}

        {/* Title */}
        {slides[currentSlide].title && (
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-primary">
            {slides[currentSlide].title}
          </h2>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {slides[currentSlide].content}
        </div>

        {/* Slide number at bottom */}
        {slides[currentSlide].type !== "title" && (
          <div className="text-right text-sm text-muted-foreground mt-8">
            {currentSlide + 1}
          </div>
        )}
      </div>
    </div>
  );
};

export default Presentation;
