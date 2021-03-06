// THIS CODE AND INFORMATION IS PROVIDED "AS IS" WITHOUT WARRANTY OF
// ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING BUT NOT LIMITED TO
// THE IMPLIED WARRANTIES OF MERCHANTABILITY AND/OR FITNESS FOR A
// PARTICULAR PURPOSE.
//
// Copyright (c) Microsoft Corporation. All rights reserved
//
// File Name:
//
//    USBMon-Bidi-Extension.js
//
// Abstract:
//
//    Sample USBMON Javascript extension file for v4 printer drivers.

// Add a reference that provides intellisense information for Windows 8 APIs.
/// <reference path="v4PrintDriver-Intellisense.js" />

function getSchemas(scriptContext, printerStream, schemaRequests, printerBidiSchemaResponses) {
    /// <summary>
    ///    Get the requested Schema(s).
    ///
    ///    The script can use the 'schemaRequests' object to iterate through the Query Keys requested by the user. Based on the query keys,
    ///    the script should use the 'printerStream' object to communicate with the USB print device and determine the values of one or more Bidi
    ///    Schema elements. For each Bidi Schema element the new value can be returned to the caller by using functions of the 'printerBidiSchemaResponses'
    ///    object. Once all query keys have been processed and all values added to the 'printerBidiSchemaResponses' object the script can return.
    ///
    ///    It is possible the attached device is not ready to return some of the requested data. In this case the function can return a value of 1 to indicate the call
    ///    should be retried after a wait.
    /// </summary>
    /// <param name="scriptContext" type="IPrinterScriptContext">
    ///     Script context object.
    /// </param>
    /// <param name="printerStream" type="IPrinterScriptableSequentialStream">
    ///    Allows the script to Write/Read data from the attached USB device.
    /// </param>
    /// <param name="schemaRequests" type="Array">
    ///    Array of strings that contains all the requested Query Keys.
    /// </param>
    /// <param name="printerBidiSchemaResponses" type="IPrinterBidiSchemaResponses">
    ///    Object the script will use to store all responses to query keys.
    /// </param>
    /// <returns type="Number" integer="true">
    ///     Integer value indicating function completion status.
    ///         1 - The attached device was not ready to provide some requested information. Call the function again using any Requery Keys added during processing.
    ///         0 - The script completed successfuly.
    /// </returns>

    var retVal = 0;

    // Loop through all the QueryKeys provided in the schemaRequests object.
    for (var index = 0; index < schemaRequests.length; index++) {
        var key = schemaRequests[index];

        // Process the "Configuration" Query key.
        if (key === "Configuration") {

            // Write command data to the device and read the response.
            // This command checks if the duplexing unit is installed.
            var duplexInstalled = false;
            var writeDataConfig = [0x0D, 0x0D, 0x02, 0xCA, 0xFE];
            var bytesWrittenConfig = printerStream.write(writeDataConfig);
            if (bytesWrittenConfig === 5) {
                // Correct number of bytes were written. Now read the response from the device.
                var readBufferConfig = printerStream.read(64);
                if (readBufferConfig.length === 1) {
                    // A value of 1 indicates the duplexing unit is installed.
                    var data = readBufferConfig.shift();
                    if (data === 1) {
                        duplexInstalled = true;
                    } else if (data === 2) {
                        // Tell USBMon to call this function again after a timeout period.
                        // Retry the "Configuration"  query key.
                        retVal = 1;
                        printerBidiSchemaResponses.addRequeryKey("Configuration");
                    }
                }
            }
            // If the device was able to process the request for Duplex status correctly,
            // add the response to the 'printerBidiSchemaResponses' object for processing by USBMon upon function completion.
            if (retVal === 0) {
                printerBidiSchemaResponses.addBool("\\Printer.Configuration.DuplexUnit:Installed", duplexInstalled);
            }

            // Write command data to the device and read the response.
            // This command requests the current memory size.
            var memSize = 0;
            var writeDataMem = [0x0D, 0x0D, 0x02, 0xAB, 0xCD];
            var bytesWrittenMem = printerStream.write(writeDataMem);
            if (bytesWrittenMem === 5) {
                // Correct number of bytes were written. Now read the response from the device.
                // Convert the incoming bytes to a string then convert the string to a number.
                var readBufferMem = printerStream.read(64);
                var bytesReadMem = readBufferMem.length;
                for (var i = 0; i < bytesReadMem; i++) {
                    // Read a byte at a time from the stream and convert to an integer.
                    memSize *= 256;
                    memSize += readBufferMem.shift();
                }
            }
            // Add the response to the 'printerBidiSchemaResponses' object for processing by USBMon upon function completion.
            printerBidiSchemaResponses.addInt32("\\Printer.Configuration.Memory:Size", memSize);

            // Read a property from the Queue Property Bag and add it to the 'printerBidiSchemaResponses' object for processing by USBMon upon function completion.
            var bag = scriptContext.QueueProperties;
            var queueProperty = bag.GetString("QueuePropName");
            printerBidiSchemaResponses.addString("\\Printer.DeviceInfo:QueueProperty", queueProperty);

        } else if (key === "IntKey") {
            // Process the "IntKey" Query key.
            // Write data to the device.
            var writeDataIntKey = [0x0D, 0x0D, 0x04, 0xDE, 0xAD, 0xBE, 0xEF];
            var bytesWrittenIntKey = printerStream.write(writeDataIntKey);
            // Add the response to the 'printerBidiSchemaResponses' object for processing by USBMon upon function completion.
            var intResult = printerBidiSchemaResponses.addInt32("\\Printer.Extension:IntegerValue", bytesWrittenIntKey);

        } else if (key === "\\Printer.Extension:StringValue") {
            // Process the "\\Printer.Extension:StringValue" Query key.
            // Write command data to the device and read the response.
            // This command retrieves a string from the device.
            var readString = "";
            var writeDataString = [0x0D, 0x0D, 0x01, 0xAA];
            var bytesWrittenString = printerStream.write(writeDataString);
            if (bytesWrittenString === 4) {
                // Correct number of bytes were written. Now read the response from the device.
                // Convert the incoming bytes to a string and store the value in the 'printerBidiSchemaResponses' object.
                var readBufferString = printerStream.read(64);
                var bytesReadString = readBufferString.length;
                for (i = 0; i < bytesReadString; i++) {
                    readString += String.fromCharCode(readBufferString.shift());
                }
            }
            // Add the response to the 'printerBidiSchemaResponses' object for processing by USBMon upon function completion.
            printerBidiSchemaResponses.addString("\\Printer.Extension:StringValue", readString);
        }
    }
    return retVal;
}

function setSchema(scriptContext, printerStream, printerBidiSchemaElement) {
    /// <summary>
    ///    Set a requested Bidi Schema Value in the device.
    ///
    ///    The script can interpret the incoming Bidi Schema value to either set data in the device or perform an action on the device.
    ///
    ///    It is possible the attached device is not ready to process the specified data. In this case the function can return a value of 1 to indicate the call
    ///    should be retried after a wait.
    /// </summary>
    ///
    /// <param name="scriptContext" type="IPrinterScriptContext">
    ///     Script context object.
    /// </param>
    /// <param name="printerStream" type="IPrinterScriptableSequentialStream">
    ///    Allows the script to Write/Read data from the attached USB device.
    /// </param>
    /// <param name="printerBidiSchemaElement" type="IPrinterBidiSchemaElement">
    ///    Contains all the data associated with the Bidi Schema Value to set.
    /// </param>
    /// <returns type="Number" integer="true">
    ///     Integer value indicating function completion status.
    ///         1 - The attached device was not ready to process/set the requested schema.  After a wait the function should be called again with the supplied printerBidiSchemaElement.
    ///         0 - The script completed successfuly.
    /// </returns>

    var retVal = 0;
    // Retrieve the Bidi Schema string to process.
    var bidiSchema = printerBidiSchemaElement.name;
    if (bidiSchema === "\\Printer.Extension:DeviceAction") {
        // Write command data to the device based on the current value of the passed in 'printerBidiSchemaElement'.
        var boolData = printerBidiSchemaElement.value;
        var writeDataBool;
        if (boolData) {
            writeDataBool = [0x65, 0x24, 0x0a];
        } else {
            writeDataBool = [0x65, 0x24, 0x0b];
        }
        var bytesWrittenBool = printerStream.write(writeDataBool);
    } else if (bidiSchema === "\\Printer.Extension:ChangeableData") {
        // Write command data to the device based on the current value of the passed in 'printerBidiSchemaElement'.
        var intData = printerBidiSchemaElement.value;
        var writeDataInt = [0x0d, 0x0a];
        writeDataInt[2] = intData;
        var bytesWrittenInt = printerStream.write(writeDataInt);
        if (bytesWrittenInt === 3) {
            // Read data from the USB device.
            var readBufferInt = printerStream.read(64);
            var bytesReadInt = readBufferInt.length;
            var data;
            // Response should be a 2 byte buffer.
            if (bytesReadInt === 2) {
                data = readBufferInt.shift();
                // Check if this is a ChangeableData value response.
                if (data === 0x1D) {
                    // Read the data byte and determine if we are done or need to try again.
                    data = readBufferInt.shift();
                    if (data === 0x01) {
                        // Tell USBMon to try again.
                        retVal = 1;
                    }
                }
            }
        }
    }
    return retVal;
}

function getStatus(scriptContext, printerStream, printerBidiSchemaResponses) {
    /// <summary>
    ///    Retrieve unsolicited Bidi Schema value updates from the USB device during printing.
    ///
    ///    This function is only called when a job is printing. A device can provide data on the read channel which this script can interpret into
    ///    Bidi Schema values and returned to USBMon.
    ///
    ///    This function will be called repeatedly during printing. It is expected the device will only return data if it is available and the script can understand it.
    ///    If the device does not support querying for unsolicited status or the script can determine that there is no need to call this function again, the script can return
    ///    a value of 2 which will tell the getStatus execution thread in USBMon to exit successfully.
    ///
    ///    If the print device does not support retrieving status during a print job this function should be left out of the driver's JavaScipt file altogether. This will inform 
    ///    USBMon to skip invocation of the function.
    /// </summary>
    /// <param name="scriptContext" type="IPrinterScriptContext">
    ///    Accessor for PropertyBags for printer driver and queue properties.
    /// </param>
    /// <param name="printerStream" type="IPrinterScriptableSequentialStream">
    ///    Allows the script to read data from the attached USB device. Calling the write function will fail. This device is opened read-only for this function.
    /// </param>
    /// <param name="printerBidiSchemaResponses" type="IPrinterBidiSchemaResponses">
    ///    Object the script will use to store all status responses.
    /// </param>
    /// <returns type="Number" integer="true">
    ///     Integer value indicating function completion status.
    ///         2 - The device no longer (if ever) supports unsolicited status so no need for USBMon to make more calls to this function.
    ///         0 - The script completed successfuly.
    /// </returns>

    var retVal = 0;

    // Read data from the USB device.
    var readBufferStatus = printerStream.read(64);
    var bytesReadStatus = readBufferStatus.length;
    var data;
    // Status Updates are 2 byte buffers.
    if (bytesReadStatus === 2) {
        data = readBufferStatus.shift();
        // Check if this is a Status value response.
        if (data === 0x1B) {
            // Read the data byte and return to USBMon for processing.
            data = readBufferStatus.shift();
            var intResult = printerBidiSchemaResponses.addInt32("\\Printer.Extension:StatusValue", data);
        } else if (data === 0x2B) {
            // This value signifies the device will not return additional status values so the thread can exit.
            retVal = 2;
        }
    }

    return retVal;
}

function requestStatus(scriptContext, printerStream, printerBidiSchemaResponses) {
    /// <summary>
    ///    Retrieve solicited Bidi Schema value updates from the USB device during printing.
    ///    This function will be called instead of getStatus if the device Printer Driver specifies an alternate BidiUSBStatusInterface to allow write/read operations
    ///    that don't conflict with the print data being sent over the primary USB Print Interface.
    ///
    ///    This function is only called when a job is printing. A device can write/read data to the Alternate interace which this script can interpret into
    ///    Bidi Schema values and returned to USBMon.
    ///
    ///    This function will be called repeatedly during printing. It is expected the device will only return data if it is available and the script can understand it.
    ///    If the device does not support querying for solicited status or the script can determine that there is no need to call this function again, the script can return
    ///    a value of 2 which will tell the requestStatus execution thread in USBMon to exit successfully.
    ///
    ///    If the print device does not support retrieving status during a print job via an alternate BidiUSBStatusInterface this function should be left out of the driver's JavaScipt 
    ///    file altogether. This will inform USBMon to skip invocation of the function.
    /// </summary>
    /// <param name="scriptContext" type="IPrinterScriptContext">
    ///    Accessor for PropertyBags for printer driver and queue properties.
    /// </param>
    /// <param name="printerStream" type="IPrinterScriptableSequentialStream">
    ///    Allows the script to write/read data from the attached USB device. 
    /// </param>
    /// <param name="printerBidiSchemaResponses" type="IPrinterBidiSchemaResponses">
    ///    Object the script will use to store all status responses.
    /// </param>
    /// <returns type="Number" integer="true">
    ///     Integer value indicating function completion status.
    ///         2 - The device no longer (if ever) supports solicited status so no need for USBMon to make more calls to this function.
    ///         0 - The script completed successfuly.
    /// </returns>

    var retVal = 0;

    // Write data to the device requesting Status data.
    var writeDataStatus = [0x0C, 0x0C];
    var bytesWrittenStatus = printerStream.write(writeDataStatus);

    if (bytesWrittenStatus === 2) {
       // Read data from the USB device.
       var readBufferStatus = printerStream.read(64);
       var bytesReadStatus = readBufferStatus.length;
       var data;
       // Status Updates are 2 byte buffers.
       if (bytesReadStatus === 2) {
           data = readBufferStatus.shift();
           // Check if this is a Status value response.
           if (data === 0x1B) {
               // Read the data byte and return to USBMon for processing.
               data = readBufferStatus.shift();
               var intResult = printerBidiSchemaResponses.addInt32("\\Printer.Extension:StatusValue", data);
           } else if (data === 0x2B) {
               // This value signifies the device will not return additional status values so the thread can exit.
               retVal = 2;
           }
       }
    }

    return retVal;
}


