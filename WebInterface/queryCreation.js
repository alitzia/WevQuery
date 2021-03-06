var xmlSchemaPath = '../eventsequencegrammar/eventseq_1.1.xsd'

/**
 * Called when the page is loaded. Runs all the initialisation functions
 * 
 */
function initialiseInterface() {
  if (getCookie("queryXMLData") !== "")
    importXML(getCookie("queryXMLData"));

  //Redirect the user when the toggle is pressed
  //queryCreation.html is on, but we show an animation
  $('#pageToggle').bootstrapToggle('on');
  $("#pageToggle").change(function () {
    if ($(this).prop('checked'))
      window.location.replace("./queryCreation.html")
    else {
      //Before moving away, store the state of the query into the cookie
      setCookie("queryXMLData", exportXML(), 1);
      window.location.replace("./analysis.html");
    }
  });
}


/**
 * This function takes a multioption object as a parameter
 * and loads a series of event values.
 * TODO: rather than static, the values should be retrieved from the xsd 
 */
function loadEventNames(multiOptionTarget) {
  console.log("loading event names");
  $.get(xmlSchemaPath, function (eventSeqTemplate) {
    console.log("xml schema loaded" + eventSeqTemplate);
    /*The usual jquery selectors work for xml, but I was having problems with xml schema.
    Instead, I will use Xpath: http://api.jquery.com/category/selectors/#XPath_Selectors*/
    //$(eventSeqTemplate).find("[name='eventType'] returns the eventType node, where all the event names are defined.
    //Look for the root (schema), then look for the list with the name attribute I want (eventType),
    //then go down one node (restriction) and then get all values from elements with the name enumeration
    result = eventSeqTemplate.evaluate("/*[local-name()='schema']/*[@name='eventType']/*[local-name()='restriction']/*[local-name()='enumeration']/@value",
      eventSeqTemplate, null, 0, null);
    while (eventNameItem = result.iterateNext()) {
      $(multiOptionTarget).append('<option>' + eventNameItem.value + '</option>');
    }
    $(multiOptionTarget).trigger('chosen:updated');
  });
}

/**
 * Similar to *loadEventNames*, it looks for all context type names,
 * and loads them into the given node.
 */
function loadContextTypes(selectElement) {
  console.log("loading event names");
  $.get(xmlSchemaPath, function (eventSeqTemplate) {
    console.log("xml schema loaded");
    result = eventSeqTemplate.evaluate("/*[local-name()='schema']/*[@name='contextType']/*[local-name()='restriction']/*[local-name()='enumeration']/@value",
      eventSeqTemplate, null, 0, null);

    //remove previously existing values, and add placeholder
    $(selectElement).empty();
    $(selectElement).append("<option value='' selected disabled>Please select</option>");

    while (eventNameItem = result.iterateNext()) {
      $(selectElement).append('<option>' + eventNameItem.value + '</option>');
    }
  });
}

/**
 * Similar to *loadContextTypes*, it looks for all context type values.
 * IS NOT FINISHED!! We would still need to query the context of the page to retrieve all possible values for the various context types.
 */
function loadContextValues(selectElement) {
  console.log("loading event names");
  $.get(xmlSchemaPath, function (eventSeqTemplate) {
    console.log("xml schema loaded");
    result = eventSeqTemplate.evaluate("/*[local-name()='schema']/*[@name='contextType']/*[local-name()='restriction']/*[local-name()='enumeration']/@value",
      eventSeqTemplate, null, 0, null);
    while (eventNameItem = result.iterateNext()) {
      $(multiOptionTarget).append('<option>' + eventNameItem.value + '</option>');
    }
  });
}

/**
 * When the user introduces a context option, it gets processed, and a new input row is added.
 * This function receives the *eventContextTable* element as a parameter
 */
function addContext(eventContextTable) {
  console.log("Adding new context option");

  //1. get the values from the last row and reset the options, for possible new input
  var contextType = $("#eventTemplateContextType").find(":selected").text();
  var contextvalue = $("#eventTemplateContextValue").val();

  //2. Check if input is correct, if not, break
  if ($("#eventTemplateContextType").find(":disabled").text().indexOf(contextType) !== -1) {
    $("#eventTemplateContextType").fadeIn(200).fadeOut(200).fadeIn(200).fadeOut(200).fadeIn(200);
    return (false);
  }
  if (contextvalue === "") {
    $("#eventTemplateContextValue").placeholder = 'Content cannot be empty';
    // Change background
    $("#eventTemplateContextValue").css('background-color', '#FF6347');
    // Wait 1 seconds, then remove the css attribute
    setTimeout(function () {
      $("#eventTemplateContextValue").css('background-color', '');
    }, 500);
    return (false);
  }

  //3. reset options for reuse
  $("#eventTemplateContextType")[0].selectedIndex = 0;
  $("#eventTemplateContextValue").val('');

  // 4. Add them as a new row before the last one.
  $(eventContextTable).find('tr:last').prev().after("<tr> <td class='contextType'>" + contextType + "</td> <td class='contextValue'>" + contextvalue
    + "</td> <td><span class='removeContext glyphicon glyphicon-minus' aria-hidden='true'></span></td> </tr>");

  //5. add the corresponding listener, so each row can be deleted:
  $(".removeContext").click(function () {
    console.log("removing context option");
    this.closest("tr").remove();
  });
}

function addEventTemplate() {

  //All elements within the form can be easily extracted, except from the table. using the following lines
  //console.log($('#eventTemplateForm').serialize())
  //$('#eventTemplateForm').serializeArray()
  //As I will have to create the div anyway, and I cannot retrieve the elements inside the table, I will just retrieve all of them manually.

  //event list
  var eventList = $("#eventMultiSelector", "#eventTemplateForm").val();
  //occurrence
  var occurrenceValue = $("input[name='occurrenceValue']", "#eventTemplateForm").val();
  //context options
  var contextTypeArray = [];
  $(".contextType", "#eventContextTable").each(function (index) {
    contextTypeArray.push($(this).text());
  });

  var contextvalueArray = [];
  $(".contextValue", "#eventContextTable").each(function (index) {
    contextvalueArray.push($(this).text());
  });

  //at least one event. I use Jquery to ease the null test.
  if ($(eventList).length == 0) {
    console.log("more events are required");
    updateTips("Introduce at least one event", "#eventTemplateDialog");
    $("#eventMultiSelector", "#eventTemplateForm").addClass("ui-state-error");
    return false;
  } else {
    $("#eventMultiSelector", "#eventTemplateForm").removeClass("ui-state-error");
  }

  //minOccurence and maxOccurrence must be nonempty, as well as either a number, or "n"
  if (occurrenceValue == "" || isNaN(occurrenceValue)) {
    console.log("occurrence missing");
    updateTips("The occurrence is required, and must be a number", $("#eventTemplateDialog"));
    $("input[name='occurrenceValue']#eventMultiSelector", "#eventTemplateForm").addClass("ui-state-error");
    return false;
  } else {
    $("input[name='occurrenceValue']#eventMultiSelector", "#eventTemplateForm").removeClass("ui-state-error");
  }

  //no need to check the context, as it can be empty

  //Finally, create the div element for the event template, and append it to the palette
  var newEventObject = $("#newEventTemplate").clone();
  newEventObject.removeAttr("id");
  $(".eventList", newEventObject).text(eventList.toString().replace(/,/g, ', '));
  $(".occurrenceValue", newEventObject).text(occurrenceValue);

  if (contextTypeArray.length > 0) {
    $(".contextHeader", newEventObject).text("Context");
    $(".contextTable", newEventObject).append("<tr> <th>name</th> <th>value</th> </tr>");
    contextTypeArray.forEach(function (typeItem, index) {
      var valueItem = contextvalueArray[index];
      $(".contextTable tr:last", newEventObject).after(
        "<tr> <td class='contextType'>" + typeItem + "</td> <td class='contextValue'>" + valueItem
        + "</td> </tr>");
    });
  }

  $("#eventPaletteArea").append(newEventObject);
  newEventObject.show();
  $("#eventTemplateDialog").dialog("close");


  return true;
}

/**
 * Update the tips with the given message, and highlights it for a brief period.
 * It receives as parameters the message to show, as well as the container of the tips object
 * The container is necessary to differentiate between the event and temporal creation dialogs
 */
function updateTips(text, container) {
  $(".validateTips", container)
    .text(text)
    .addClass("ui-state-highlight");
  setTimeout(function () {
    $(".validateTips", container).removeClass("ui-state-highlight", 1500);
  }, 500);
}

/**
 * To be called when an event is dragged from the palette to the ordered area.
 * Will set a unique ID for that event. Possibly some additional tasks as well.
 */
function addEventToOrderedList(eventTemplateObject) {
  //To determine the ID, get the full list of generated IDs
  // and check the biggest one. I will use .match(/\d+/) to extract the number from the ID
  //This is more reliable than keeping a constant, counting the number of issued IDs
  var idNumberList = $(".eventTemplate", "#eventOrderArea").map(function () {
    //there will always be one element without ID, the one being inserted
    if ($(this)[0].hasAttribute("id"))
      return $(this).attr("id").match(/\d+/);
  });

  //The max function cannot be directly applied to an array, the apply function transforms the array into a list of parameters
  var newNumId = 1;
  if (idNumberList.length != 0)
    newNumId = Math.max.apply(Math, idNumberList) + 1;

  $(eventTemplateObject).attr("id", "event" + newNumId);
  $(".eventTitle", eventTemplateObject).text("Event " + newNumId);

  //remove the paletteArea class
  $(eventTemplateObject).removeClass("eventTemplatePalette");
  console.log("Setting new id to " + newNumId);
}

/**
 * To be called when a new temporal constraint is to be created.
 * It shows a dialog that contains the various necessary options.
 */
function addTemporalConstraint() {


  var relation = $("input[name='relationRadio']:checked", "#temporalCostraintDialog").val();
  var startEvent = $("#tempConstraintSelectEv1", "#temporalCostraintDialog").text();
  var endEvent = $("#tempConstraintSelectEv2", "#temporalCostraintDialog").text();
  var duration = $("#tempConstraintDuration", "#temporalCostraintDialog").val();
  var unit = $("input[name='unitRadio']:checked", "#temporalCostraintDialog").val();

  //Check all inputs are correct. If not, use jquery UI ui-state-error class

  //Has the user selected the relation?
  if ($("input[name='relationRadio']:checked", "#temporalCostraintDialog").length == 0) {
    updateTips("Select the relation between the events", "#temporalCostraintDialog");
    $("input[name='relationRadio']", "#temporalCostraintDialog").addClass("ui-state-error");
    return false;
  } else {
    $("input[name='relationRadio']", "#temporalCostraintDialog").removeClass("ui-state-error");
  }
  //Does the chosen events exist in the ordered area?
  if ($("#" + startEvent, "#eventOrderArea").length == 0 || $("#" + endEvent, "#eventOrderArea").length == 0) {
    updateTips("Select the events for the constraint", "#temporalCostraintDialog");
    $("#tempConstraintSelectEv1, #tempConstraintSelectEv2", "#temporalCostraintDialog").addClass("ui-state-error");
    return false;
  } else {
    $("#tempConstraintSelectEv1, #tempConstraintSelectEv2", "#temporalCostraintDialog").removeClass("ui-state-error");
  }
  //is the duration valid?
  if (isNaN(duration)) {
    updateTips("A number indicating the duration of the constraint is required", "#temporalCostraintDialog");
    $("#tempConstraintDuration", "#temporalCostraintDialog").addClass("ui-state-error");
    return false;
  } else {
    $("#tempConstraintDuration", "#temporalCostraintDialog").removeClass("ui-state-error");
  }
  //Has the user selected the unit?
  if ($("input[name='unitRadio']:checked", "#temporalCostraintDialog").length == 0) {
    updateTips("Select the relation between the events", "#temporalCostraintDialog");
    $("input[name='unitRadio']", "#temporalCostraintDialog").addClass("ui-state-error");
    return false;
  } else {
    $("input[name='unitRadio']", "#temporalCostraintDialog").removeClass("ui-state-error");
  }

  //Finally, create the div element for the temporal constraint, and append it to the temporal area
  var newTempConstObject = $("#newTempConstTemplate").clone();
  newTempConstObject.removeAttr("id");
  newTempConstObject.attr("start", startEvent);
  newTempConstObject.attr("end", endEvent);
  newTempConstObject.attr("type", relation);
  newTempConstObject.attr("value", duration);
  newTempConstObject.attr("unit", unit);
  //we make it resizable
  newTempConstObject.resizable(resizableTemplate);

  $("#tempConstraintsArea").append(newTempConstObject);
  newTempConstObject.show();
  updateTemporalConstraints();
  $("#temporalCostraintDialog").dialog("close");
  return true;
}


/**
 * Takes the current state of the Web application and builds an XML out of it
 * Doesn't take any parameters, and get triggered through a simple "export" button.
 *  If the xml is not well formed, or doesn't conform to the schema, it returns the error message
 */

function exportXML() {

  xmlDoc = document.implementation.createDocument(null, "eql");
  rootNode = xmlDoc.getElementsByTagName("eql")[0];

  //Add xml properties, so it links it back to the xsd
  //rootNode.setAttribute("xmlns","moving-project.eu/userlogqal");
  //rootNode.setAttribute("xmlns:xsi","http://www.w3.org/2001/XMLSchema-instance");
  //rootNode.setAttribute("xsi:schemaLocation","moving-project.eu/userlogqal eventseq.xsd");

  var newEventTemplateNode, newEventListNode, newTempConstListNode, newTempConstNode;
  //all info to be retrieved from the event
  var eventList, minOccurrence, maxOccurrence, contextListType, contextListValue, newContextNode;
  //variables for the temp constraint
  var eventRefNode;
  //necessary variable to establish order
  var previousNode = "null";
  $(".eventTemplate", "#eventOrderArea").each(function () {
    //parse each event's' data into the event node
    newEventTemplateNode = xmlDoc.createElement("event");
    newEventTemplateNode.setAttribute("id", $(this).attr("id"));
    newEventTemplateNode.setAttribute("pre", previousNode);
    previousNode = $(this).attr("id");
    newEventTemplateNode.setAttribute("occurrences", $(".occurrenceValue", this).text());

    //For each event in the event list, create a node
    //Remember!!! there is a space after each comma
    eventList = $(".eventList", this).text().split(", ");

    $(eventList).each(function () {
      newEventListNode = xmlDoc.createElement("eventList");
      newEventListNode.appendChild(xmlDoc.createTextNode(this));
      newEventTemplateNode.appendChild(newEventListNode);
    });

    //For each context object create a node
    contextListType = $(".contextType", this);
    contextListValue = $(".contextValue", this);

    $(contextListType).each(function (index) {
      newContextNode = xmlDoc.createElement("context");
      newContextNode.setAttribute("type", $(contextListType[index]).text());
      newContextNode.setAttribute("value", $(contextListValue[index]).text());
      newEventTemplateNode.appendChild(newContextNode);
    });

    //append it to the rootElement
    rootNode.appendChild(newEventTemplateNode);
  });

  newTempConstListNode = xmlDoc.createElement("temporalconstraintList");
  //For each temporal constraint
  $(".tempConstraintObject", "#tempConstraintsArea").each(function () {
    newTempConstNode = xmlDoc.createElement("temporalconstraint");
    newTempConstNode.setAttribute("type", $(this).attr("type"));
    newTempConstNode.setAttribute("value", $(this).attr("value"));

    //the unit needs to be stored using the corresponding code
    newTempConstNode.setAttribute("unit", $(this).attr("unit"));

    //There can only be 2 event references.
    eventRefNode = xmlDoc.createElement("eventref");
    eventRefNode.setAttribute("id", $(this).attr("start"));
    newTempConstNode.appendChild(eventRefNode);

    eventRefNode = xmlDoc.createElement("eventref");
    eventRefNode.setAttribute("id", $(this).attr("end"));
    newTempConstNode.appendChild(eventRefNode);

    newTempConstListNode.append(newTempConstNode);
  });
  rootNode.appendChild(newTempConstListNode);
  console.log(xmlDoc);

  //validate the xml against the schema
  var xmlString = (new XMLSerializer()).serializeToString(xmlDoc);
  console.log(xmlString);
  return (xmlString);
}

/**
 * To be implemented. It takes an XML query and imports it into the interface.
 * It needs to take into account the corresponding IDs.
 */
function importXML(xmlString) {

  parser = new DOMParser();
  xmlDoc = parser.parseFromString(xmlString, "text/xml");

  rootNode = xmlDoc.getElementsByTagName("eql")[0];

  var eventPre = "null";

  //the events will be popped out in order
  while ($(xmlDoc).find("event").length > 0) {
    var xmlEventObject = $(xmlDoc).find("event[pre='" + eventPre + "']");

    var newEventObject = $("#newEventTemplate").clone();
    newEventObject.removeAttr("id");

    var eventList = "";
    xmlEventObject.find("eventList").each(function (index, obj) {
      if (index == 0)
        eventList += $(this).text();
      else
        eventList += ", " + $(this).text();
    });
    $(".eventList", newEventObject).text(eventList);

    $(".occurrenceValue", newEventObject).text(xmlEventObject.attr("occurrences"));

    var contextList = [];

    xmlEventObject.find("context").each(function (index, obj) {
      var tempContextObject = {};
      tempContextObject.type = $(this).attr("type");
      tempContextObject.value = $(this).attr("value");
      contextList.push(tempContextObject);
    });
    if (contextList.length > 0) {
      $(".contextHeader", newEventObject).text("Context");
      $(".contextTable", newEventObject).append("<tr> <th>name</th> <th>value</th> </tr>");
      contextList.forEach(function (contextItem, index) {
        $(".contextTable tr:last", newEventObject).after(
          "<tr> <td class='contextType'>" + contextItem.type + "</td> <td class='contextValue'>" + contextItem.value
          + "</td> </tr>");
      });
    }

    $("#eventPaletteArea").append(newEventObject);
    newEventObject.show();

    //At this point some modifications need to be done, to make the event fit the ordered area
    var newOrderedEventObject = newEventObject.clone();
    newOrderedEventObject.attr("id", xmlEventObject.attr("id"));
    $(".eventTitle", newOrderedEventObject).text(xmlEventObject.attr("id"));
    newOrderedEventObject.removeClass("eventTemplatePalette");
    $("#eventOrderArea").append(newOrderedEventObject);
    newOrderedEventObject.show();

    //next event to be popped is the one following current ID
    eventPre = xmlEventObject.attr("id");
    $(xmlDoc).find("event[id='" + eventPre + "']").remove();

  }


  $(xmlDoc).find("temporalconstraint").each(function () {
    var newTempConstObject = $("#newTempConstTemplate").clone();
    newTempConstObject.removeAttr("id");
    newTempConstObject.attr("start", $(this).find("eventref").eq(0).attr("id"));
    newTempConstObject.attr("end", $(this).find("eventref").eq(1).attr("id"));
    newTempConstObject.attr("type", $(this).attr("type"));
    newTempConstObject.attr("value", $(this).attr("value"));
    newTempConstObject.attr("unit", $(this).attr("unit"));
    //we make it resizable
    newTempConstObject.resizable(resizableTemplate);

    $("#tempConstraintsArea").append(newTempConstObject);
    newTempConstObject.show();
  });

  updateTemporalConstraints();

}


/**
 * This function tries to save the query with a given title
 * 
 */
function saveQuery() {
  requestSaveXmlQuery($("#queryTitle","#saveQueryDialog").val(),
    exportXML());
}

/**
 * Show query saving result
 */

function showSaveQueryResult(message) {
  if (message) {
    if ($("#saveQueryDialog").is(':visible')) {
      updateTips(message, $("#saveQueryDialog"));
    }
    else
      showErrorMessage("Save Query", message);
  }
  else{
    $("#saveQueryDialog").dialog("close");
    notifyUser("Query has been saved",false);
  }
}

/**
 * Shows a toast to the user, temporarily showing some information
 */
function showToast(message) {
  var x = document.getElementById("toastbar")
  x.className = "show";
  x.textContent = message;
  setTimeout(function () { x.className = x.className.replace("show", ""); }, 3000);
}

/**
 * Shows a generic error message with the given title and message, with only one button
 */
function showErrorMessage(title, message) {
  $("p", "#dialog-confirm").text(message);

  var confirmDialog = $("#dialog-confirm").dialog({
    title: title,
    resizable: false,
    height: "auto",
    width: 400,
    modal: true,
    buttons: {
      Close: function () {
        confirmDialog.dialog("close");
      }
    },
    //The only purpose of the following code is to find the newly generated "close window" element, and fix the icon
    //Clashes between bootstrap and jquery-ui break it by default
    open: function () {
      $(this).closest(".ui-dialog")
        .find(".ui-dialog-titlebar-close")
        .removeClass("ui-dialog-titlebar-close")
        .html("<span class='glyphicon glyphicon-remove' onclick='confirmDialog.dialog( 'close');'></span>");

    },
  });
  confirmDialog.show();
}



function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
  var expires = "expires=" + d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}