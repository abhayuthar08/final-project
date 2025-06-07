

const express = require('express');
const router = express.Router();
const Listing = require('../models/listing.js');
const { isLoggedIn, isOwner } = require('../middelware.js');
const listingController = require('../controllers/listing.js');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');

// Home page listing
router.get('/', listingController.index);

// New form
router.get('/new', isLoggedIn, listingController.renderNewForm);

// Create new
router.post('/', isLoggedIn, listingController.createNewPost);

// Show detail
router.get('/:id', listingController.showRoute);

// Book ticket form
router.get('/:id/book', isLoggedIn, async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) {
    req.flash('error', 'Museum not found!');
    return res.redirect('/listings');
  }
  res.render('listings/bookticket', { listing });
});

// Submit booking + generate PDF
router.post('/:id/book', async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      req.flash('error', 'Museum not found!');
      return res.redirect('/listings');
    }

    const { museumName, members, visitDate, userName, userNumber } = req.body;
    const ticketId = uuidv4();
    const entryQR = await QRCode.toDataURL(`Entry - Ticket ID: ${ticketId}`);
    const exitQR = await QRCode.toDataURL(`Exit - Ticket ID: ${ticketId}`);

    const doc = new PDFDocument();
    res.setHeader('Content-disposition', 'attachment; filename=ticket.pdf');
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(25).text('Museum Ticket', { align: 'center' }).moveDown();
    doc.fontSize(18).text(`Museum Name: ${museumName}`);
    doc.text(`Visit Date: ${visitDate}`);
    doc.text(`Number of Members: ${members}`);
    doc.text(`User Name: ${userName}`);
    doc.text(`User Mobile: ${userNumber}`);
    doc.text(`Ticket ID: ${ticketId}`).moveDown();

    const qrSize = 100;
    const xMargin = 50;
    const y = doc.y;

    doc.fontSize(12).text('Entry QR Code:', xMargin, y);
    doc.image(entryQR, xMargin, y + 20, { fit: [qrSize, qrSize] });

    const rightMargin = 500 - qrSize - xMargin;
    doc.text('Exit QR Code:', rightMargin, y);
    doc.image(exitQR, rightMargin, y + 20, { fit: [qrSize, qrSize] });

    doc.end();
  } catch (error) {
    console.error('Booking error:', error);
    req.flash('error', 'Ticket booking failed!');
    res.redirect(`/listings/${req.params.id}/book`);
  }
});

// Edit, Update, Delete
router.get('/:id/edit', isLoggedIn, isOwner, listingController.editRoute);
router.put('/:id', isLoggedIn, isOwner, listingController.updateRoute);
router.delete('/:id', isLoggedIn, isOwner, listingController.deleteRoute);

module.exports = router;
